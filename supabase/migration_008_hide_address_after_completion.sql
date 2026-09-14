-- ============================================================
-- ServiYa Phase 2.4: 配達完了/キャンセル後は、プロバイダーが
-- 顧客の住所(señas particulares・GPSピン等)を見られないようにする
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

drop policy if exists "providers_view_customer_for_assigned_orders" on public.customer_profiles;

create policy "providers_view_customer_for_assigned_orders"
on public.customer_profiles
for select
using (
  exists (
    select 1 from public.orders o
    where o.customer_id = customer_profiles.id
    and o.provider_id = auth.uid()
    and o.status not in ('delivered', 'cancelled')
  )
);
