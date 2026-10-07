alter table public.provider_profiles
  add column if not exists face_photo_path text,
  add column if not exists cedula_photo_path text;

update public.provider_profiles
set face_photo_path = regexp_replace(
      face_photo_url,
      '^https?://[^/]+/storage/v1/object/public/verification-docs/',
      ''
    )
where face_photo_path is null
  and face_photo_url like '%/storage/v1/object/public/verification-docs/%';

update public.provider_profiles
set cedula_photo_path = regexp_replace(
      cedula_photo_url,
      '^https?://[^/]+/storage/v1/object/public/verification-docs/',
      ''
    )
where cedula_photo_path is null
  and cedula_photo_url like '%/storage/v1/object/public/verification-docs/%';

create or replace function public.protect_provider_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
begin
  select is_admin into is_admin_user from public.profiles where id = auth.uid();

  if auth.uid() is not null and not coalesce(is_admin_user, false) then
    if new.status is distinct from old.status
       or new.cedula_verified is distinct from old.cedula_verified
       or new.rating is distinct from old.rating
       or new.legal_name_from_registry is distinct from old.legal_name_from_registry
       or new.cedula is distinct from old.cedula
       or new.face_photo_url is distinct from old.face_photo_url
       or new.cedula_photo_url is distinct from old.cedula_photo_url
       or new.face_photo_path is distinct from old.face_photo_path
       or new.cedula_photo_path is distinct from old.cedula_photo_path then
      new.status := old.status;
      new.cedula_verified := old.cedula_verified;
      new.rating := old.rating;
      new.legal_name_from_registry := old.legal_name_from_registry;
      new.cedula := old.cedula;
      new.face_photo_url := old.face_photo_url;
      new.cedula_photo_url := old.cedula_photo_url;
      new.face_photo_path := old.face_photo_path;
      new.cedula_photo_path := old.cedula_photo_path;
    end if;
  end if;

  return new;
end;
$$;
