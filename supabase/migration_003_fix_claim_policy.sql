-- ============================================================
-- ServiYa 修正パッチ: 注文受諾時の "new row violates row-level
-- security policy" エラーを直します
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

drop policy if exists "providers_claim_open_orders" on public.orders;

create policy "providers_claim_open_orders" on public.orders
  for update using (
    status = 'placed'
    and provider_id is null
    and exists (
      select 1 from public.provider_profiles p
      where p.id = auth.uid() and p.status = 'approved'
    )
  )
  with check (
    provider_id = auth.uid()
  );
