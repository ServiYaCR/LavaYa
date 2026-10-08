-- ============================================================
-- ServiYa Security Hardening 022
-- 一般ユーザーが「新規作成(INSERT)」や「削除(DELETE)」を使って
-- 管理者権限・審査ステータス・注文状態を自分で設定できてしまう穴を塞ぎます。
--
-- 背景:
--   migration 007 / 013 / 014 / 017 は「更新(UPDATE)」だけを守っていました。
--   そのため、画面を通さずAPIを直接使うと、次のことが可能でした。
--     (A) profiles を自分で作る時に is_admin = true を入れる → 管理者になれる
--     (B) provider_profiles を自分で作る時に status = 'approved' を入れる
--         → 本人確認の審査なしで承認済みProviderになれる
--     (C) 却下・停止されたProviderが自分の provider_profiles を削除し、
--         (B)の方法で作り直す → 承認済みに戻れる
--     (D) orders を作る時に status / provider_id / 確定価格などを自由に入れられる
--
-- 方針:
--   ・画面からの正規の登録・注文は、これまでどおり通る(送っている値を変えない)。
--   ・一般ユーザーが送った「運営だけが決める欄」は、作成時に初期値へ戻す。
--     (007/013 と同じ「上書きして無効化する」方式)
--   ・管理者(profiles.is_admin = true)と、ダッシュボード/SQL Editor/サーバー
--     側の操作(auth.uid() が NULL)は、これまでどおり素通しにする。
--   ・ProviderがAPIから自分の provider_profiles を削除する経路をなくす。
--
-- 実装上の注意:
--   リポジトリ内のSQLには、本番DBにある一部の列(bank_iban など)や
--   is_admin_user() 関数の定義が含まれていません。
--   本番に存在しない列名を直接代入すると、注文作成や登録が壊れるため、
--   jsonb_populate_record() を使っています。これは「存在しない列名は無視する」
--   動きをするので、列の有無に関わらず安全に初期値へ戻せます。
--
-- Supabase SQL Editorで、新しいクエリとして実行してください。
-- 実行後、ファイル末尾の「確認用クエリ」も実行してください。
-- ============================================================


-- ------------------------------------------------------------
-- 共通: 呼び出したユーザーが管理者かどうか
-- (本番の is_admin_user() の定義がリポジトリに無いため、
--  この migration の中で完結する判定を使います)
-- ------------------------------------------------------------
create or replace function public.caller_is_admin_022()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke execute on function public.caller_is_admin_022() from public, anon, authenticated;


-- ------------------------------------------------------------
-- (A) profiles 作成時: is_admin を必ず false にする
-- ------------------------------------------------------------
create or replace function public.guard_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ダッシュボード/SQL Editor/サーバー側の操作は素通し
  if auth.uid() is null then
    return new;
  end if;

  if public.caller_is_admin_022() then
    return new;
  end if;

  new.is_admin := false;
  return new;
end;
$$;

revoke execute on function public.guard_profile_insert() from public, anon, authenticated;

drop trigger if exists guard_profile_insert_trigger on public.profiles;
create trigger guard_profile_insert_trigger
before insert on public.profiles
for each row execute function public.guard_profile_insert();


-- ------------------------------------------------------------
-- (B) provider_profiles 作成時: 審査に関わる欄を初期値に戻す
--   status                  → 'pending_review'
--   cedula_verified         → false
--   legal_name_from_registry → NULL (TSE照合で運営側が入れる欄)
--   rating                  → 5.0   (schema.sql の初期値)
-- ------------------------------------------------------------
create or replace function public.guard_provider_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.caller_is_admin_022() then
    return new;
  end if;

  new := jsonb_populate_record(
    new,
    jsonb_build_object(
      'status', 'pending_review',
      'cedula_verified', false,
      'legal_name_from_registry', null,
      'rating', 5.0
    )
  );
  return new;
end;
$$;

revoke execute on function public.guard_provider_profile_insert() from public, anon, authenticated;

drop trigger if exists guard_provider_profile_insert_trigger on public.provider_profiles;
create trigger guard_provider_profile_insert_trigger
before insert on public.provider_profiles
for each row execute function public.guard_provider_profile_insert();


-- ------------------------------------------------------------
-- (C) provider_profiles: 本人による削除をできなくする
--   これまでの "provider_profiles_all_own" (for all = 参照・作成・更新・削除)を、
--   参照・作成・更新の3つに分けます。削除は管理者用ポリシー
--   (admin_all_provider_profiles)だけが持つ形になります。
-- ------------------------------------------------------------
drop policy if exists "provider_profiles_all_own" on public.provider_profiles;
drop policy if exists "provider_profiles_select_own" on public.provider_profiles;
drop policy if exists "provider_profiles_insert_own" on public.provider_profiles;
drop policy if exists "provider_profiles_update_own" on public.provider_profiles;

create policy "provider_profiles_select_own" on public.provider_profiles
  for select using (auth.uid() = id);

create policy "provider_profiles_insert_own" on public.provider_profiles
  for insert with check (auth.uid() = id);

create policy "provider_profiles_update_own" on public.provider_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);


-- ------------------------------------------------------------
-- (D) orders 作成時: 運営・Providerが決める欄を初期値に戻す
--   status → 'placed'、provider_id / final_weight_kg / price_colones /
--   cancelled_at / cancellation_fee_colones / pickup_photo_url /
--   delivery_photo_url → NULL、unsanitary_flagged → false
--   (customer_id が本人であることは既存の RLS "orders_insert_customer" が確認)
--   ※ estimated_price_colones(見積額)は画面側で計算した値をそのまま保存します。
--     料金ルールの扱いは business spec の判断事項のため、この migration では変えません。
-- ------------------------------------------------------------
create or replace function public.guard_order_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.caller_is_admin_022() then
    return new;
  end if;

  new := jsonb_populate_record(
    new,
    jsonb_build_object(
      'status', 'placed',
      'provider_id', null,
      'final_weight_kg', null,
      'price_colones', null,
      'cancelled_at', null,
      'cancellation_fee_colones', null,
      'pickup_photo_url', null,
      'delivery_photo_url', null,
      'unsanitary_flagged', false
    )
  );
  return new;
end;
$$;

revoke execute on function public.guard_order_insert() from public, anon, authenticated;

drop trigger if exists guard_order_insert_trigger on public.orders;
create trigger guard_order_insert_trigger
before insert on public.orders
for each row execute function public.guard_order_insert();


-- ============================================================
-- 確認用クエリ(実行後にこの部分だけ選択して実行してください)
-- ============================================================
-- 1) provider_profiles に、一般ユーザー向けの DELETE / ALL ポリシーが残っていないこと
--    → admin_all_provider_profiles 以外に cmd = 'DELETE' または 'ALL' の行が出なければOK
-- select policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename = 'provider_profiles'
-- order by policyname;
--
-- 2) 3つのトリガーが作られていること → 3行出ればOK
-- select tgname, tgrelid::regclass from pg_trigger
-- where tgname in ('guard_profile_insert_trigger',
--                  'guard_provider_profile_insert_trigger',
--                  'guard_order_insert_trigger');
