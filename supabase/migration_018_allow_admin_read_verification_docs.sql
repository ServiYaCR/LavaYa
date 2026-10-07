drop policy if exists "admins_read_verification_docs" on storage.objects;
create policy "admins_read_verification_docs"
on storage.objects
for select
to authenticated
using (bucket_id = 'verification-docs' and public.is_admin_user());
