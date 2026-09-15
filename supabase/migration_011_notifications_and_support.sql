-- ============================================================
-- ServiYa Phase 3: アプリ内通知 + サポート申請(キャンセル例外・破損トラブル)
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

-- ------------------------------------------------------------
-- 1. 通知テーブル
-- ------------------------------------------------------------
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. 注文ステータス変化を検知して通知を作る(顧客向け)
-- ------------------------------------------------------------
create or replace function public.notify_on_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  msg text;
begin
  if new.status = old.status then
    return new;
  end if;

  msg := case new.status
    when 'awaiting_pickup' then 'Un Lavandero/a aceptó tu pedido. Prepara tu bolsa.'
    when 'picked_up' then 'Tu ropa fue recogida.'
    when 'ready_for_delivery' then 'Tu pedido está listo. Monto final: ₡' || to_char(round(new.price_colones), 'FM999G999G999')
    when 'delivered' then '¡Tu pedido fue entregado! Gracias por usar ServiYa.'
    when 'cancelled' then 'Tu pedido fue cancelado.'
    else null
  end;

  if msg is not null then
    insert into public.notifications (user_id, order_id, message)
    values (new.customer_id, new.id, msg);
  end if;

  return new;
end;
$$;

drop trigger if exists notify_on_order_status_change_trigger on public.orders;
create trigger notify_on_order_status_change_trigger
after update on public.orders
for each row execute function public.notify_on_order_status_change();

-- ------------------------------------------------------------
-- 3. 予約前日のリマインダー(pg_cronで毎日実行)
-- ------------------------------------------------------------
create extension if not exists pg_cron;

create or replace function public.send_scheduled_pickup_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, order_id, message)
  select o.customer_id, o.id,
    'Recordatorio: tu pedido está programado para mañana (' || o.scheduled_pickup_date || ').'
  from public.orders o
  where o.scheduled_pickup_date = ((now() at time zone 'America/Costa_Rica')::date + 1)
    and o.status in ('placed', 'awaiting_pickup');
end;
$$;

select cron.schedule(
  'servyia-pickup-reminders',
  '0 2 * * *',  -- UTC 2:00 = コスタリカ時間 20:00(前日夜)
  $$select public.send_scheduled_pickup_reminders();$$
);

-- ------------------------------------------------------------
-- 4. サポート申請(キャンセル例外・破損/紛失トラブル)
-- ------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete set null,
  reporter_id uuid not null references public.profiles(id),
  category text not null check (category in ('cancellation_exception', 'damage_claim', 'other')),
  description text not null,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  owner_decision_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.support_tickets enable row level security;

create policy "support_tickets_select_own" on public.support_tickets
  for select using (auth.uid() = reporter_id);
create policy "support_tickets_insert_own" on public.support_tickets
  for insert with check (auth.uid() = reporter_id);

-- サポート申請の判断結果(承諾/却下)が確定したら、申請者に通知を作る
create or replace function public.notify_on_ticket_resolved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> old.status and new.status in ('approved', 'rejected') then
    insert into public.notifications (user_id, order_id, message)
    values (
      new.reporter_id,
      new.order_id,
      case new.status
        when 'approved' then 'Tu solicitud de soporte fue aprobada. ' || coalesce(new.owner_decision_note, '')
        when 'rejected' then 'Tu solicitud de soporte fue rechazada. ' || coalesce(new.owner_decision_note, '')
      end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_on_ticket_resolved_trigger on public.support_tickets;
create trigger notify_on_ticket_resolved_trigger
after update on public.support_tickets
for each row execute function public.notify_on_ticket_resolved();
