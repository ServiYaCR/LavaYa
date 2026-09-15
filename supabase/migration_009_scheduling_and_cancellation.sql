-- ============================================================
-- ServiYa Phase 2.5: スケジュール集荷(都度指定の単発予約) + キャンセルポリシー
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

-- 1. スケジュール集荷・キャンセル関連のカラムを追加
alter table public.orders
  add column if not exists scheduled_pickup_date date,       -- NULLなら「今すぐ」、日付があれば「その日に予約」
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_fee_colones numeric;

-- 2. 未受注リストの関数を更新: 予約日がまだ来ていない注文はプロバイダーに見せない
--    (予約日の朝になったら自動的に一覧に出てくる。バッチ処理は不要)
--    ※ 戻り値の列構成が変わるため、まず既存の関数を削除してから作り直す
drop function if exists public.get_available_orders_with_distance(double precision, double precision);

create or replace function public.get_available_orders_with_distance(
  provider_lat double precision,
  provider_lng double precision
)
returns table (
  id uuid,
  status order_status,
  express boolean,
  bag_labels jsonb,
  estimated_weight_kg numeric,
  estimated_price_colones numeric,
  pickup_window text,
  special_instructions text,
  created_at timestamptz,
  scheduled_pickup_date date,
  province text,
  canton text,
  distance_km numeric
)
language sql
security definer
set search_path = public
as $$
  select
    o.id, o.status, o.express, o.bag_labels, o.estimated_weight_kg,
    o.estimated_price_colones, o.pickup_window, o.special_instructions, o.created_at,
    o.scheduled_pickup_date,
    cp.province, cp.canton,
    round(
      (6371 * acos(
        least(1, greatest(-1,
          cos(radians(provider_lat)) * cos(radians(cp.latitude)) *
          cos(radians(cp.longitude) - radians(provider_lng)) +
          sin(radians(provider_lat)) * sin(radians(cp.latitude))
        ))
      ))::numeric, 1
    ) as distance_km
  from public.orders o
  join public.customer_profiles cp on cp.id = o.customer_id
  where o.status = 'placed'
    and o.provider_id is null
    and (o.scheduled_pickup_date is null or o.scheduled_pickup_date <= (now() at time zone 'America/Costa_Rica')::date)
    and exists (
      select 1 from public.provider_profiles pp
      where pp.id = auth.uid() and pp.status = 'approved'
    )
  order by distance_km asc;
$$;

grant execute on function public.get_available_orders_with_distance to authenticated;

-- 3. キャンセルポリシーの強制(顧客が直接APIを叩いても回避できないようにする)
--    - status = 'placed'(未受注)からのキャンセル: 無料
--    - status = 'placed'以外(受注後: awaiting_pickup・picked_up・以降すべて)からのキャンセル: 不可(サポート対応のみ)
create or replace function public.enforce_cancellation_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'placed' then
    raise exception 'Este pedido ya fue aceptado por un Lavandero/a y no se puede cancelar. Contacta a soporte.';
  end if;

  if new.status = 'cancelled' and old.status = 'placed' then
    new.cancelled_at := now();
    new.cancellation_fee_colones := 0;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_cancellation_policy_trigger on public.orders;
create trigger enforce_cancellation_policy_trigger
before update on public.orders
for each row execute function public.enforce_cancellation_policy();
