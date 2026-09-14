-- ============================================================
-- ServiYa Phase 2.3: プロフィール編集機能を追加する前の安全対策
-- provider_profiles は今 "本人なら全部編集可能" というルールなので、
-- このままプロフィール編集画面を追加すると、悪意あるリクエストで
-- 審査ステータス(status)や評価(rating)を自分で書き換えられてしまいます。
-- それを防ぐトリガーを追加します。
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

create or replace function public.protect_provider_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid()がNULL = SupabaseダッシュボードのSQL Editor/Table Editorから
  -- 直接操作している(=運営の手動承認)ケースなので、そのときは何もしない
  if auth.uid() is not null then
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

drop trigger if exists protect_provider_profile_admin_fields_trigger on public.provider_profiles;

create trigger protect_provider_profile_admin_fields_trigger
before update on public.provider_profiles
for each row execute function public.protect_provider_profile_admin_fields();
