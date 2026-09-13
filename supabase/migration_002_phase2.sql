-- ============================================================
-- ServiYa Phase 2: 注文作成・マッチング・料金計算
-- 既存のSupabaseプロジェクトのSQL Editorで、これを追加実行してください
-- (schema.sqlは既に実行済みの前提で、差分だけを反映するファイルです)
-- ============================================================

-- 集荷/配達の希望時間帯(早朝・夜間は割増)
alter table public.orders
  add column if not exists pickup_window text
  check (pickup_window in ('normal', 'early', 'night'))
  default 'normal';

-- 顧客が申告した目安金額(確定額はfinal_weight_kg計測後のprice_colones)
alter table public.orders
  add column if not exists estimated_price_colones numeric;

-- ------------------------------------------------------------
-- 承認済みプロバイダーが「未受注の注文」を見て、受諾できるようにする
-- ------------------------------------------------------------
create policy "providers_view_open_orders" on public.orders
  for select using (
    status = 'placed'
    and provider_id is null
    and exists (
      select 1 from public.provider_profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );

create policy "providers_claim_open_orders" on public.orders
  for update using (
    status = 'placed'
    and provider_id is null
    and exists (
      select 1 from public.provider_profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  );
