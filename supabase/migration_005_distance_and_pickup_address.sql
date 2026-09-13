-- ============================================================
-- ServiYa Phase 2.1: プロバイダーへの距離表示 + 受諾後の住所閲覧
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

-- ------------------------------------------------------------
-- 1. 受諾前の「未受注リスト」用: 州・郡・距離だけを返す関数
--    (señas particulares等の詳細住所はまだ見せない = プライバシー保護)
-- ------------------------------------------------------------
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
    and exists (
      select 1 from public.provider_profiles pp
      where pp.id = auth.uid() and pp.status = 'approved'
    )
  order by distance_km asc;
$$;

grant execute on function public.get_available_orders_with_distance to authenticated;

-- ------------------------------------------------------------
-- 2. 受諾後: 担当プロバイダーが集荷先の詳細住所を見られるようにする
--    (señas particulares・アクセス方法・GPSピンなど)
-- ------------------------------------------------------------
create policy "providers_view_customer_for_assigned_orders"
on public.customer_profiles
for select
using (
  exists (
    select 1 from public.orders o
    where o.customer_id = customer_profiles.id
    and o.provider_id = auth.uid()
  )
);
