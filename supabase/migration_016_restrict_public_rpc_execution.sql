create or replace function public.provider_active_job_count(pid uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null or pid is distinct from auth.uid() then 0
    else (
      select count(*)::int
      from public.orders
      where provider_id = pid
        and status in ('awaiting_pickup', 'picked_up', 'washing', 'ready_for_delivery')
    )
  end;
$$;

revoke execute on function public.get_available_orders_with_distance(double precision, double precision) from public, anon;
grant execute on function public.get_available_orders_with_distance(double precision, double precision) to authenticated, service_role;
revoke execute on function public.is_admin_user() from public, anon;
grant execute on function public.is_admin_user() to authenticated, service_role;
revoke execute on function public.provider_active_job_count(uuid) from public, anon;
grant execute on function public.provider_active_job_count(uuid) to authenticated, service_role;
