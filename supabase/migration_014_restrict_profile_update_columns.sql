revoke update on table public.profiles from anon, authenticated;
grant update (full_name, phone_whatsapp, role)
on table public.profiles
to authenticated;
