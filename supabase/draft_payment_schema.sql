-- ============================================================
-- ServiYa Phase 3(下書き): ONVO Marketplace連携の準備
-- ⚠️ これはまだ実行しないでください。ONVOからの回答を受けて
-- フィールド名・フローを確定させてから正式なmigrationとして出します。
-- ============================================================

-- provider_profiles: ONVOのサブ加盟店としての登録状況を管理
-- alter table public.provider_profiles
--   add column onvo_submerchant_id text,          -- ONVO側の加盟店ID
--   add column onvo_onboarding_status text          -- 'not_started' | 'pending' | 'completed'
--     check (onvo_onboarding_status in ('not_started', 'pending', 'completed'))
--     default 'not_started';

-- customer_profiles: 保存済みカード/決済手段の参照(カード番号そのものは保存しない)
-- alter table public.customer_profiles
--   add column onvo_customer_id text;               -- ONVO側の顧客ID(トークン化された決済手段を紐付け)

-- orders: 決済状況の追跡
-- alter table public.orders
--   add column payment_status text
--     check (payment_status in ('pending', 'paid', 'failed', 'refunded'))
--     default 'pending',
--   add column onvo_payment_id text;                -- ONVO側の決済ID(webhook照合用)

-- 想定フロー(ONVOの回答待ちのため仮):
-- 1. プロバイダー承認時に、ONVO側でサブ加盟店オンボーディングを開始
-- 2. 顧客が注文時にONVOのCheckout/APIでカード情報を入力(こちら側はカード番号を一切扱わない)
-- 3. 重量確定→金額確定のタイミングで、ONVO側に決済をキャプチャ
-- 4. ONVOのMarketplace機能が、手数料を差し引いてプロバイダーへ自動精算
-- 5. Webhookで決済結果・精算結果を受け取り、上記カラムを更新
