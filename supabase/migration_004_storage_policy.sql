-- ============================================================
-- ServiYa 修正パッチ: verification-docs バケットへの
-- アップロード許可を追加します(new row violates RLS の修正)
-- Supabase SQL Editorで、新しいクエリとして実行してください
-- ============================================================

-- ログイン済みユーザーが、自分のユーザーID配下のフォルダにだけ
-- ファイルをアップロードできるようにする
create policy "authenticated_users_upload_own_verification_docs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'verification-docs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 本人が自分のアップロード済みファイルを読めるようにする
-- (バケットをPublicにしている場合は誰でも読めるので必須ではありませんが、
--  念のため本人分は明示的に許可しておきます)
create policy "authenticated_users_read_own_verification_docs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'verification-docs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
