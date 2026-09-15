-- ============================================================
-- ServiYa Phase 3: アドミンページ用の権限追加
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- daisuke.baba@gmail.com のアカウントだけを管理者にする
-- (実行前に、このメールアドレスで既にアカウント登録済みであることを確認してください)
update public.profiles
set is_admin = true
where email = 'daisuke.baba@gmail.com';

-- ------------------------------------------------------------
-- 管理者は以下のテーブルを全件見られる・操作できるようにする
-- (既存の「本人のみ」ポリシーは残したまま、管理者用ポリシーを追加するだけ)
-- ------------------------------------------------------------

create policy "admin_all_profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "admin_all_customer_profiles" on public.customer_profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "admin_all_provider_profiles" on public.provider_profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "admin_all_orders" on public.orders
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "admin_all_support_tickets" on public.support_tickets
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "admin_all_notifications" on public.notifications
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- provider_profilesの自己承認防止トリガーは、管理者による変更は素通しにする
-- (既存のprotect_provider_profile_admin_fields関数を、管理者判定込みに更新)
create or replace function public.protect_provider_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
begin
  select is_admin into is_admin_user from public.profiles where id = auth.uid();

  if auth.uid() is not null and not coalesce(is_admin_user, false) then
    if new.status is distinct from old.status
       or new.cedula_verified is distinct from old.cedula_verified
       or new.rating is distinct from old.rating
       or new.legal_name_from_registry is distinct from old.legal_name_from_registry
       or new.cedula is distinct from old.cedula
       or new.face_photo_url is distinct from old.face_photo_url
       or new.cedula_photo_url is distinct from old.cedula_photo_url then
      new.status := old.status;
      new.cedula_verified := old.cedula_verified;
      new.rating := old.rating;
      new.legal_name_from_registry := old.legal_name_from_registry;
      new.cedula := old.cedula;
      new.face_photo_url := old.face_photo_url;
      new.cedula_photo_url := old.cedula_photo_url;
    end if;
  end if;

  return new;
end;
$$;

-- 注文のキャンセル制限も、管理者による操作は素通しにする
-- (既存のenforce_cancellation_policy関数を、管理者判定込みに更新)
create or replace function public.enforce_cancellation_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
begin
  select is_admin into is_admin_user from public.profiles where id = auth.uid();

  if coalesce(is_admin_user, false) then
    if new.status = 'cancelled' then
      new.cancelled_at := now();
    end if;
    return new;
  end if;

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
