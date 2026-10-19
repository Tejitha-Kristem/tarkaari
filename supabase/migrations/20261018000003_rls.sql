-- Row-level security.
--
-- Principles
--  * RLS is on for every table; no policy means no access.
--  * Column grants limit WHAT a user may write; policies limit WHICH rows.
--  * Orders, order items, payments, approvals, merges and pauses are written
--    only through SECURITY DEFINER functions (added in later migrations) that
--    check the booking window and roles in IST inside the database.
--  * The service role (server-only, cron jobs) bypasses RLS.

alter table public.users enable row level security;
alter table public.apartments enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_apartments enable row level security;
alter table public.households enable row level security;
alter table public.catalogue_items enable row level security;
alter table public.vendor_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.vendor_holidays enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reports enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges. Start from nothing, then grant precisely.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.catalogue_items to anon, authenticated;

grant select on public.users to authenticated;
grant update (name, language) on public.users to authenticated;

grant select on public.apartments to authenticated;
grant insert (id, name, area, city, lat, lng, house_count_estimate, created_by) on public.apartments to authenticated;

grant select on public.vendors to authenticated;
grant insert (id, user_id, shop_name, address, shop_photo, id_photo, upi_id, service_charge) on public.vendors to authenticated;
grant update (shop_name, address, shop_photo, id_photo, upi_id, service_charge) on public.vendors to authenticated;

grant select, insert, update, delete on public.vendor_apartments to authenticated;

grant select on public.households to authenticated;
grant insert (id, user_id, apartment_id, flat_no, block, vendor_id) on public.households to authenticated;
grant update (apartment_id, flat_no, block, vendor_id) on public.households to authenticated;

grant select, delete on public.vendor_items to authenticated;
grant insert (id, vendor_id, catalogue_item_id, unit, step, price_min, price_max, reason_tag, available, listed)
  on public.vendor_items to authenticated;
grant update (unit, step, price_min, price_max, reason_tag, available, listed)
  on public.vendor_items to authenticated;

grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.payments to authenticated;

grant select, insert, delete on public.vendor_holidays to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select, insert, delete on public.push_subscriptions to authenticated;

grant select on public.reports to authenticated;
grant insert (from_user, about, order_id, text) on public.reports to authenticated;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create policy users_select on public.users for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
    or public.is_my_customer(id)      -- vendor sees their customers' names and phones
    or public.is_my_vendor_user(id)   -- customer sees their vendor's name and phone
  );

create policy users_update_self on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- apartments: anyone signed in can search and add; admin merges via function.
-- ---------------------------------------------------------------------------
create policy apartments_select on public.apartments for select to authenticated
  using (true);

create policy apartments_insert on public.apartments for insert to authenticated
  with check (created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- vendors: invisible to customers until approved.
-- ---------------------------------------------------------------------------
create policy vendors_select on public.vendors for select to authenticated
  using (
    user_id = (select auth.uid())
    or approval_status = 'active'
    or id = (select public.my_household_vendor_id())  -- still see a paused vendor you owe
    or (select public.is_admin())
  );

create policy vendors_insert_self on public.vendors for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy vendors_update_self on public.vendors for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- vendor_apartments
-- ---------------------------------------------------------------------------
create policy vendor_apartments_select on public.vendor_apartments for select to authenticated
  using (
    vendor_id = (select public.current_vendor_id())
    or (select public.is_admin())
    or (active and exists (
      select 1 from public.vendors v where v.id = vendor_id and v.approval_status = 'active'
    ))
  );

create policy vendor_apartments_write on public.vendor_apartments for all to authenticated
  using (vendor_id = (select public.current_vendor_id()))
  with check (vendor_id = (select public.current_vendor_id()));

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create policy households_select on public.households for select to authenticated
  using (
    user_id = (select auth.uid())
    or vendor_id = (select public.current_vendor_id())
    or (select public.is_admin())
  );

create policy households_insert_self on public.households for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy households_update_self on public.households for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- catalogue_items: public read; admin writes with the service role.
-- ---------------------------------------------------------------------------
create policy catalogue_items_select_anon on public.catalogue_items for select to anon
  using (active);

create policy catalogue_items_select on public.catalogue_items for select to authenticated
  using (active or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- vendor_items: prices of approved vendors are visible to signed-in users.
-- ---------------------------------------------------------------------------
create policy vendor_items_select on public.vendor_items for select to authenticated
  using (
    vendor_id = (select public.current_vendor_id())
    or (select public.is_admin())
    or (listed and exists (
      select 1 from public.vendors v where v.id = vendor_id and v.approval_status = 'active'
    ))
  );

create policy vendor_items_write on public.vendor_items for all to authenticated
  using (vendor_id = (select public.current_vendor_id()))
  with check (vendor_id = (select public.current_vendor_id()));

-- ---------------------------------------------------------------------------
-- orders / order_items / payments: read-only here; written via functions.
-- ---------------------------------------------------------------------------
create policy orders_select on public.orders for select to authenticated
  using (
    household_id = (select public.current_household_id())
    or vendor_id = (select public.current_vendor_id())
    or (select public.is_admin())
  );

create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));  -- inherits orders RLS

create policy payments_select on public.payments for select to authenticated
  using (
    household_id = (select public.current_household_id())
    or vendor_id = (select public.current_vendor_id())
    or (select public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- vendor_holidays: customers need them to block dates.
-- ---------------------------------------------------------------------------
create policy vendor_holidays_select on public.vendor_holidays for select to authenticated
  using (true);

create policy vendor_holidays_insert on public.vendor_holidays for insert to authenticated
  with check (vendor_id = (select public.current_vendor_id()));

create policy vendor_holidays_delete on public.vendor_holidays for delete to authenticated
  using (vendor_id = (select public.current_vendor_id()));

-- ---------------------------------------------------------------------------
-- notifications: own inbox; rows are created server-side.
-- ---------------------------------------------------------------------------
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create policy reports_select on public.reports for select to authenticated
  using (from_user = (select auth.uid()) or (select public.is_admin()));

create policy reports_insert_self on public.reports for insert to authenticated
  with check (from_user = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Function privileges: helpers are for signed-in users only.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.app_now() to anon, authenticated;
grant execute on function public.booking_state(timestamptz) to anon, authenticated;
grant execute on function public.can_customer_edit(date, timestamptz) to authenticated;
grant execute on function public.vendor_accept_deadline(date) to authenticated;
grant execute on function public.search_apartments(text, integer) to authenticated;
grant execute on function public.unit_price_basis(public.item_unit) to anon, authenticated;
grant execute on function public.default_step(public.item_unit) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_vendor_id() to authenticated;
grant execute on function public.current_household_id() to authenticated;
grant execute on function public.my_household_vendor_id() to authenticated;
grant execute on function public.is_my_customer(uuid) to authenticated;
grant execute on function public.is_my_vendor_user(uuid) to authenticated;
