-- ============================================================
-- ServiYa Phase 2.2: プロバイダー1人あたりの同時受注上限
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

-- 現在「進行中」の仕事数を数える関数
-- (delivered / cancelled / disputed は進行中に含めない)
create or replace function public.provider_active_job_count(pid uuid)
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.orders
  where provider_id = pid
    and status in ('awaiting_pickup', 'picked_up', 'washing', 'ready_for_delivery');
$$;

grant execute on function public.provider_active_job_count to authenticated;

-- 受諾ポリシーを、上限チェック付きに差し替え
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
    and public.provider_active_job_count(auth.uid()) < 3  -- 上限: 同時3件まで（変更したい場合はこの数字だけ書き換え）
  );
