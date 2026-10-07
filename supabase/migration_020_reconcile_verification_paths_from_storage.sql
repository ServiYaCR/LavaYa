update public.provider_profiles p
set face_photo_path = (
  select o.name
  from storage.objects o
  where o.bucket_id='verification-docs'
    and (storage.foldername(o.name))[1]=p.id::text
    and o.name like p.id::text || '/face-%'
  order by o.created_at desc
  limit 1
),
cedula_photo_path = (
  select o.name
  from storage.objects o
  where o.bucket_id='verification-docs'
    and (storage.foldername(o.name))[1]=p.id::text
    and o.name like p.id::text || '/cedula-%'
  order by o.created_at desc
  limit 1
)
where exists (
  select 1 from storage.objects o
  where o.bucket_id='verification-docs'
    and (storage.foldername(o.name))[1]=p.id::text
);
