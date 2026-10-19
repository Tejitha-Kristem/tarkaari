-- Time rules, role helpers and integrity triggers.

-- ---------------------------------------------------------------------------
-- Booking window (IST). Mirrors src/lib/time.ts; keep the two in sync.
-- Orders placed 10:00–16:59 IST are for delivery tomorrow. From 17:00 they lock.
-- The vendor must accept by 21:00 IST the evening before delivery.
-- ---------------------------------------------------------------------------
create function public.booking_state(p_at timestamptz default now())
returns table (phase text, delivery_date date, closes_at timestamptz, opens_at timestamptz)
language sql stable
set search_path = ''
as $$
  with t as (select (p_at at time zone 'Asia/Kolkata') as local)
  select
    case
      when local::time < time '10:00' then 'not_open'
      when local::time < time '17:00' then 'open'
      else 'locked'
    end,
    local::date + 1,
    case when local::time >= time '10:00' and local::time < time '17:00'
      then (local::date + time '17:00') at time zone 'Asia/Kolkata' end,
    case
      when local::time < time '10:00' then (local::date + time '10:00') at time zone 'Asia/Kolkata'
      when local::time >= time '17:00' then (local::date + 1 + time '10:00') at time zone 'Asia/Kolkata'
    end
  from t
$$;

create function public.can_customer_edit(p_delivery_date date, p_at timestamptz default now())
returns boolean
language sql stable
set search_path = ''
as $$
  select b.phase = 'open' and b.delivery_date = p_delivery_date
  from public.booking_state(p_at) b
$$;

create function public.vendor_accept_deadline(p_delivery_date date)
returns timestamptz
language sql immutable
set search_path = ''
as $$ select ((p_delivery_date - 1) + time '21:00') at time zone 'Asia/Kolkata' $$;

-- ---------------------------------------------------------------------------
-- Role helpers for RLS. SECURITY DEFINER so policies can call them without
-- recursing through each other's RLS; each only reveals facts about the caller.
-- ---------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  )
$$;

create function public.current_vendor_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select id from public.vendors where user_id = (select auth.uid()) $$;

create function public.current_household_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select id from public.households where user_id = (select auth.uid()) $$;

-- The vendor chosen by the caller's household (customers may always see it).
create function public.my_household_vendor_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select vendor_id from public.households where user_id = (select auth.uid()) $$;

-- True if p_user_id is a customer of the calling vendor.
create function public.is_my_customer(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.households h
    where h.user_id = p_user_id
      and h.vendor_id = (select v.id from public.vendors v where v.user_id = (select auth.uid()))
  )
$$;

-- True if p_user_id owns the vendor the caller's household buys from.
create function public.is_my_vendor_user(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.households h
    join public.vendors v on v.id = h.vendor_id
    where h.user_id = (select auth.uid()) and v.user_id = p_user_id
  )
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger apartments_updated_at before update on public.apartments
  for each row execute function public.set_updated_at();
create trigger vendors_updated_at before update on public.vendors
  for each row execute function public.set_updated_at();
create trigger vendor_apartments_updated_at before update on public.vendor_apartments
  for each row execute function public.set_updated_at();
create trigger households_updated_at before update on public.households
  for each row execute function public.set_updated_at();
create trigger vendor_items_updated_at before update on public.vendor_items
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Create the profile row when someone signs in with OTP for the first time.
-- The client may pass { language: 'kn' } as user metadata on sign-up.
create function public.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.users (id, phone, language)
  values (
    new.id,
    new.phone,
    case when new.raw_user_meta_data ->> 'language' = 'kn' then 'kn'::public.app_language
         else 'en'::public.app_language end
  )
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Becoming a vendor: new vendor rows always start pending, and the owner's role
-- flips from customer to vendor.
create function public.handle_new_vendor()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.users set role = 'vendor' where id = new.user_id and role = 'customer';
  return new;
end
$$;

create trigger on_vendor_created after insert on public.vendors
  for each row execute function public.handle_new_vendor();

-- Fill in the stepper increment from the unit when the app omits it.
create function public.vendor_items_default_step()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.step is null then
    new.step := public.default_step(new.unit);
  end if;
  return new;
end
$$;

create trigger vendor_items_default_step before insert or update of unit, step on public.vendor_items
  for each row execute function public.vendor_items_default_step();

-- A household may only pick a vendor that is approved and actively serves its apartment.
create function public.households_check_vendor()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.vendor_id is not null
     and (tg_op = 'INSERT' or new.vendor_id is distinct from old.vendor_id
          or new.apartment_id is distinct from old.apartment_id)
     and not exists (
       select 1
       from public.vendor_apartments va
       join public.vendors v on v.id = va.vendor_id
       where va.vendor_id = new.vendor_id
         and va.apartment_id = new.apartment_id
         and va.active
         and v.approval_status = 'active'
     )
  then
    raise exception 'This vendor does not deliver to your apartment'
      using errcode = 'P0001', hint = 'vendor_not_serving_apartment';
  end if;
  return new;
end
$$;

create trigger households_check_vendor before insert or update on public.households
  for each row execute function public.households_check_vendor();

-- ---------------------------------------------------------------------------
-- Apartment search (search first, add if not found). Runs as the caller.
-- ---------------------------------------------------------------------------
create function public.search_apartments(p_query text, p_limit integer default 20)
returns setof public.apartments
language sql stable
set search_path = ''
as $$
  select a.*
  from public.apartments a
  where a.status = 'active'
    and (
      a.name operator(extensions.%) p_query
      or a.area operator(extensions.%) p_query
      or a.name ilike '%' || p_query || '%'
      or a.area ilike '%' || p_query || '%'
    )
  order by greatest(extensions.similarity(a.name, p_query), extensions.similarity(a.area, p_query)) desc,
           a.name
  limit least(greatest(p_limit, 1), 50)
$$;
