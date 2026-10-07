create or replace function public.sync_provider_verification_paths()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  face_path text;
  cedula_path text;
begin
  if new.face_photo_path is null then
    select o.name into face_path
    from storage.objects o
    where o.bucket_id = 'verification-docs'
      and (storage.foldername(o.name))[1] = new.id::text
      and o.name like new.id::text || '/face-%'
    order by o.created_at desc
    limit 1;
    new.face_photo_path := face_path;
  end if;

  if new.cedula_photo_path is null then
    select o.name into cedula_path
    from storage.objects o
    where o.bucket_id = 'verification-docs'
      and (storage.foldername(o.name))[1] = new.id::text
      and o.name like new.id::text || '/cedula-%'
    order by o.created_at desc
    limit 1;
    new.cedula_photo_path := cedula_path;
  end if;

  if new.face_photo_path is not null then
    if new.face_photo_path not like new.id::text || '/face-%'
       or not exists (
         select 1 from storage.objects o
         where o.bucket_id='verification-docs'
           and o.name=new.face_photo_path
       ) then
      raise exception 'Invalid face verification path';
    end if;
  end if;

  if new.cedula_photo_path is not null then
    if new.cedula_photo_path not like new.id::text || '/cedula-%'
       or not exists (
         select 1 from storage.objects o
         where o.bucket_id='verification-docs'
           and o.name=new.cedula_photo_path
       ) then
      raise exception 'Invalid cedula verification path';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_provider_verification_paths_trigger on public.provider_profiles;
create trigger sync_provider_verification_paths_trigger
before insert or update on public.provider_profiles
for each row
execute function public.sync_provider_verification_paths();

revoke execute on function public.sync_provider_verification_paths()
from public, anon, authenticated;
