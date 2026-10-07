create or replace function public.guard_order_updates()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if public.is_admin_user() then
    return new;
  end if;
  if old.customer_id = uid then
    if not (old.status = 'placed' and new.status = 'cancelled') then
      raise exception 'Customer is not allowed to make this order update';
    end if;
    if (to_jsonb(new) - array['status','cancelled_at','cancellation_fee_colones','updated_at'])
       is distinct from
       (to_jsonb(old) - array['status','cancelled_at','cancellation_fee_colones','updated_at']) then
      raise exception 'Customer may only cancel the order';
    end if;
    return new;
  end if;
  if old.provider_id is null and old.status = 'placed'
     and new.provider_id = uid and new.status = 'awaiting_pickup' then
    if (to_jsonb(new) - array['provider_id','status','updated_at'])
       is distinct from
       (to_jsonb(old) - array['provider_id','status','updated_at']) then
      raise exception 'Provider claim may only set provider and status';
    end if;
    return new;
  end if;
  if old.provider_id = uid then
    if old.status = 'awaiting_pickup' and new.status = 'picked_up' then
      if (to_jsonb(new) - array['status','updated_at']) is distinct from (to_jsonb(old) - array['status','updated_at']) then
        raise exception 'Provider may only advance order status';
      end if;
      return new;
    elsif old.status = 'picked_up' and new.status = 'washing' then
      if (to_jsonb(new) - array['status','updated_at']) is distinct from (to_jsonb(old) - array['status','updated_at']) then
        raise exception 'Provider may only advance order status';
      end if;
      return new;
    elsif old.status = 'washing' and new.status = 'ready_for_delivery' then
      if new.final_weight_kg is null or new.final_weight_kg <= 0 or new.price_colones is null or new.price_colones <= 0 then
        raise exception 'Final weight and price are required';
      end if;
      if (to_jsonb(new) - array['status','final_weight_kg','price_colones','updated_at']) is distinct from (to_jsonb(old) - array['status','final_weight_kg','price_colones','updated_at']) then
        raise exception 'Provider may only set final weight, price, and advance status';
      end if;
      return new;
    elsif old.status = 'ready_for_delivery' and new.status = 'delivered' then
      if (to_jsonb(new) - array['status','updated_at']) is distinct from (to_jsonb(old) - array['status','updated_at']) then
        raise exception 'Provider may only advance order status';
      end if;
      return new;
    else
      raise exception 'Invalid provider order transition';
    end if;
  end if;
  raise exception 'User is not allowed to update this order';
end;
$$;

drop trigger if exists guard_order_updates_trigger on public.orders;
create trigger guard_order_updates_trigger
before update on public.orders
for each row execute function public.guard_order_updates();
