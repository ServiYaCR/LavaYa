-- ============================================================
-- ServiYa Phase 3: 料金体系の変更
-- - 手数料15%→30%
-- - 最低料金を₡10,000に統一(標準/Express共通)
-- - Trust & Safetyフィー(₡1,500、全額運営保持)を新設
-- - 大型・特殊品料金(₡4,000/点)を新設
-- 金額の計算自体はjs/pricing.js側で行うため、DB側は
-- 大型品の点数を保存するカラムを追加するだけです
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

alter table public.orders
  add column if not exists oversized_items int not null default 0;
