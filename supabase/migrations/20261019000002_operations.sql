-- Everything customers, vendors and admins DO. Each function checks who is
-- calling and the IST booking window inside the database, then writes with
-- definer rights; RLS keeps direct table writes closed.
--
-- Errors are raised as P0001 with a short machine code in the message
-- (e.g. 'booking_closed'); the app turns codes into translated text.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.fail(p_code text)
returns void
language plpgsql
set search_path = ''
as $$ begin raise exception '%', p_code using errcode = 'P0001'; end $$;

-- The calling user, if signed in and not blocked.
create function public.require_active_user()
returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then perform public.fail('not_signed_in'); end if;
  if exists (select 1 from public.users where id = uid and status = 'blocked') then perform public.fail('account_blocked'); end if;
  return uid;
end $$;

-- The calling vendor's id; must be approved unless p_allow_pending.
create function public.require_vendor(p_allow_pending boolean default false)
returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare v record;
begin
  perform public.require_active_user();
  select id, approval_status into v from public.vendors where user_id = auth.uid();
  if v.id is null then perform public.fail('not_a_vendor'); end if;
  if v.approval_status = 'blocked' then perform public.fail('vendor_blocked'); end if;
  if not p_allow_pending and v.approval_status <> 'active' then perform public.fail('vendor_not_active'); end if;
  return v.id;
end $$;

create function public.require_admin()
returns void
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform public.require_active_user();
  if not public.is_admin() then perform public.fail('not_admin'); end if;
end $$;

-- Estimate (and, once packed, final total) of one order.
create function public.recompute_order(p_order_id uuid)
returns void
language sql security definer
set search_path = ''
as $$
  update public.orders o set
    est_min = o.service_charge + coalesce((
      select sum(oi.qty_ordered * oi.price_min_snapshot / public.unit_price_basis(oi.unit_snapshot))
      from public.order_items oi where oi.order_id = o.id and oi.available is distinct from false), 0),
    est_max = o.service_charge + coalesce((
      select sum(oi.qty_ordered * oi.price_max_snapshot / public.unit_price_basis(oi.unit_snapshot))
      from public.order_items oi where oi.order_id = o.id and oi.available is distinct from false), 0),
    final_total = case when o.status in ('packed', 'delivered') then o.service_charge + coalesce((
      select sum(oi.line_total) from public.order_items oi where oi.order_id = o.id and oi.available), 0) end
  where o.id = p_order_id
$$;

-- When orders for a delivery date stop changing: 17:00 IST the day before.
create function public.orders_lock_at(p_delivery_date date)
returns timestamptz
language sql immutable
set search_path = ''
as $$ select ((p_delivery_date - 1) + time '17:00') at time zone 'Asia/Kolkata' $$;

-- ---------------------------------------------------------------------------
-- Customer
-- ---------------------------------------------------------------------------

-- Replaces the caller's order for the open delivery date with p_items:
-- [{ "vendor_item_id": uuid, "qty": number }]. An empty list cancels it.
create function public.place_order(p_items jsonb)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  h public.households;
  v public.vendors;
  b record;
  o public.orders;
  wanted int;
  added int;
begin
  perform public.require_active_user();
  select * into h from public.households where user_id = auth.uid();
  if h.id is null then perform public.fail('no_household'); end if;
  if h.vendor_id is null then perform public.fail('no_vendor'); end if;
  if h.paused then perform public.fail('household_paused'); end if;

  select * into v from public.vendors where id = h.vendor_id;
  if v.approval_status <> 'active' then perform public.fail('vendor_unavailable'); end if;
  if not exists (select 1 from public.vendor_apartments va
                 where va.vendor_id = v.id and va.apartment_id = h.apartment_id and va.active) then
    perform public.fail('vendor_unavailable');
  end if;

  select * into b from public.booking_state();
  if b.phase <> 'open' then perform public.fail('booking_closed'); end if;
  if exists (select 1 from public.vendor_holidays where vendor_id = v.id and date = b.delivery_date) then
    perform public.fail('vendor_holiday');
  end if;

  select * into o from public.orders
  where household_id = h.id and delivery_date = b.delivery_date and status <> 'cancelled'
  for update;
  if o.id is not null and o.status <> 'placed' then perform public.fail('order_locked'); end if;

  wanted := coalesce(jsonb_array_length(p_items), 0);
  if wanted = 0 then
    if o.id is not null then
      update public.orders set status = 'cancelled', cancelled_at = now() where id = o.id;
    end if;
    return null;
  end if;
  if wanted > 60 then perform public.fail('too_many_items'); end if;

  if o.id is null then
    insert into public.orders (household_id, vendor_id, apartment_id, delivery_date, service_charge)
    values (h.id, v.id, h.apartment_id, b.delivery_date, v.service_charge)
    returning * into o;
  else
    update public.orders set service_charge = v.service_charge, apartment_id = h.apartment_id where id = o.id;
    delete from public.order_items where order_id = o.id;
  end if;

  insert into public.order_items (order_id, vendor_item_id, catalogue_item_id, unit_snapshot, qty_ordered,
                                  price_min_snapshot, price_max_snapshot)
  select o.id, vi.id, vi.catalogue_item_id, vi.unit, (e ->> 'qty')::numeric, vi.price_min, vi.price_max
  from jsonb_array_elements(p_items) e
  join public.vendor_items vi on vi.id = (e ->> 'vendor_item_id')::uuid
  where vi.vendor_id = v.id and vi.listed and vi.available
    and (e ->> 'qty')::numeric > 0 and (e ->> 'qty')::numeric <= 10000;
  get diagnostics added = row_count;
  if added <> wanted then perform public.fail('item_unavailable'); end if;

  perform public.recompute_order(o.id);
  return o.id;
end $$;

create function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare o public.orders;
begin
  perform public.require_active_user();
  select * into o from public.orders
  where id = p_order_id and household_id = public.current_household_id() for update;
  if o.id is null then perform public.fail('order_not_found'); end if;
  if o.status <> 'placed' or not public.can_customer_edit(o.delivery_date) then perform public.fail('order_locked'); end if;
  update public.orders set status = 'cancelled', cancelled_at = now() where id = o.id;
end $$;

-- "I've paid" (UPI) or "I paid in cash". The vendor confirms later.
create function public.claim_payment(p_amount numeric, p_method public.payment_method, p_order_id uuid default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare h public.households; pid uuid;
begin
  perform public.require_active_user();
  select * into h from public.households where user_id = auth.uid();
  if h.id is null or h.vendor_id is null then perform public.fail('no_vendor'); end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then perform public.fail('bad_amount'); end if;
  if p_order_id is not null and not exists (
    select 1 from public.orders where id = p_order_id and household_id = h.id and status = 'delivered') then
    perform public.fail('order_not_found');
  end if;
  insert into public.payments (household_id, vendor_id, order_id, amount, method, status)
  values (h.id, h.vendor_id, p_order_id, round(p_amount, 2), p_method, 'claimed')
  returning id into pid;
  return pid;
end $$;

-- Billed (delivered orders) minus confirmed payments, per household and vendor.
create function public.household_ledger(p_household_id uuid, p_vendor_id uuid)
returns table (billed numeric, paid numeric, claimed numeric, balance numeric, oldest_unpaid date)
language sql stable security definer
set search_path = ''
as $$
  with billed as (
    select coalesce(sum(final_total), 0) amt, min(delivery_date) first_date
    from public.orders where household_id = p_household_id and vendor_id = p_vendor_id and status = 'delivered'
  ), pay as (
    select coalesce(sum(amount) filter (where status = 'confirmed'), 0) confirmed,
           coalesce(sum(amount) filter (where status = 'claimed'), 0) claimed
    from public.payments where household_id = p_household_id and vendor_id = p_vendor_id
  ), unpaid as (
    -- Oldest delivered order not yet covered by confirmed payments (first-in, first-out).
    select min(delivery_date) d from (
      select delivery_date, sum(final_total) over (order by delivery_date, id) running
      from public.orders where household_id = p_household_id and vendor_id = p_vendor_id and status = 'delivered'
    ) x where running > (select confirmed from pay)
  )
  select billed.amt, pay.confirmed, pay.claimed, billed.amt - pay.confirmed, unpaid.d
  from billed, pay, unpaid
$$;

create function public.my_ledger()
returns table (billed numeric, paid numeric, claimed numeric, balance numeric, oldest_unpaid date)
language sql stable security definer
set search_path = ''
as $$
  select l.* from public.households h, public.household_ledger(h.id, h.vendor_id) l
  where h.user_id = auth.uid() and h.vendor_id is not null
$$;

-- ---------------------------------------------------------------------------
-- Vendor
-- ---------------------------------------------------------------------------

-- Accepts every placed order for a delivery date once booking has locked.
-- Items not explicitly unticked become available.
create function public.vendor_accept_orders(p_delivery_date date)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor(); n int;
begin
  if public.app_now() < public.orders_lock_at(p_delivery_date) then perform public.fail('booking_still_open'); end if;
  update public.order_items oi set available = true
  from public.orders o
  where oi.order_id = o.id and o.vendor_id = vid and o.delivery_date = p_delivery_date
    and o.status = 'placed' and oi.available is null;
  update public.orders set status = 'accepted', accepted_at = now()
  where vendor_id = vid and delivery_date = p_delivery_date and status = 'placed';
  get diagnostics n = row_count;
  return n;
end $$;

-- Tick / untick one item of a locked order (before it is packed).
create function public.vendor_set_item_available(p_order_item_id uuid, p_available boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor(); o public.orders;
begin
  select o2.* into o from public.orders o2 join public.order_items oi on oi.order_id = o2.id
  where oi.id = p_order_item_id and o2.vendor_id = vid for update of o2;
  if o.id is null then perform public.fail('order_not_found'); end if;
  if o.status not in ('placed', 'accepted') then perform public.fail('order_locked'); end if;
  if public.app_now() < public.orders_lock_at(o.delivery_date) then perform public.fail('booking_still_open'); end if;
  update public.order_items set available = p_available,
    qty_actual = case when p_available then qty_actual else null end,
    final_price = case when p_available then final_price else null end
  where id = p_order_item_id;
  perform public.recompute_order(o.id);
end $$;

-- Saves weights and prices: [{ "order_item_id", "qty_actual", "final_price" }]
-- and marks the order packed. Prices must sit inside each item's range.
create function public.vendor_pack_order(p_order_id uuid, p_items jsonb)
returns numeric
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor(); o public.orders; total numeric;
begin
  select * into o from public.orders where id = p_order_id and vendor_id = vid for update;
  if o.id is null then perform public.fail('order_not_found'); end if;
  if o.status not in ('accepted', 'packed') then perform public.fail('order_not_accepted'); end if;

  update public.order_items oi set
    qty_actual = (e ->> 'qty_actual')::numeric,
    final_price = (e ->> 'final_price')::numeric
  from jsonb_array_elements(p_items) e
  where oi.id = (e ->> 'order_item_id')::uuid and oi.order_id = o.id and oi.available;

  if exists (select 1 from public.order_items where order_id = o.id and available
             and (qty_actual is null or final_price is null)) then
    perform public.fail('items_not_weighed');
  end if;

  update public.orders set status = 'packed', packed_at = coalesce(packed_at, now()) where id = o.id;
  perform public.recompute_order(o.id);
  select final_total into total from public.orders where id = o.id;
  return total;
end $$;

create function public.vendor_mark_delivered(p_order_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor();
begin
  update public.orders set status = 'delivered', delivered_at = now()
  where id = p_order_id and vendor_id = vid and status = 'packed';
  if not found then perform public.fail('order_not_packed'); end if;
end $$;

-- Dues for every household that buys from the caller.
create function public.vendor_dues()
returns table (household_id uuid, user_id uuid, name text, phone text, apartment_id uuid, block text, flat_no text,
               paused boolean, billed numeric, paid numeric, claimed numeric, balance numeric, oldest_unpaid date,
               pending_payment_id uuid, pending_amount numeric, pending_method public.payment_method)
language sql stable security definer
set search_path = ''
as $$
  select h.id, u.id, u.name, u.phone, h.apartment_id, h.block, h.flat_no, h.paused,
         l.billed, l.paid, l.claimed, l.balance, l.oldest_unpaid,
         p.id, p.amount, p.method
  from public.households h
  join public.users u on u.id = h.user_id
  cross join lateral public.household_ledger(h.id, h.vendor_id) l
  left join lateral (
    select id, amount, method from public.payments
    where household_id = h.id and vendor_id = h.vendor_id and status = 'claimed'
    order by created_at limit 1
  ) p on true
  where h.vendor_id = public.require_vendor(true)
$$;

create function public.vendor_confirm_payment(p_payment_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor();
begin
  update public.payments set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid()
  where id = p_payment_id and vendor_id = vid and status = 'claimed';
  if not found then perform public.fail('payment_not_found'); end if;
end $$;

-- "Not received": the claim is removed; the balance stays owed.
create function public.vendor_reject_payment(p_payment_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor();
begin
  delete from public.payments where id = p_payment_id and vendor_id = vid and status = 'claimed';
  if not found then perform public.fail('payment_not_found'); end if;
end $$;

create function public.vendor_record_cash(p_household_id uuid, p_amount numeric)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor(); pid uuid;
begin
  if not exists (select 1 from public.households where id = p_household_id and vendor_id = vid) then
    perform public.fail('not_your_customer');
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then perform public.fail('bad_amount'); end if;
  insert into public.payments (household_id, vendor_id, amount, method, status, confirmed_at, confirmed_by)
  values (p_household_id, vid, round(p_amount, 2), 'cash', 'confirmed', now(), auth.uid())
  returning id into pid;
  return pid;
end $$;

create function public.vendor_set_household_paused(p_household_id uuid, p_paused boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor(true);
begin
  update public.households set paused = p_paused where id = p_household_id and vendor_id = vid;
  if not found then perform public.fail('not_your_customer'); end if;
end $$;

create function public.vendor_set_household_terms(p_household_id uuid, p_mode public.payment_mode, p_method public.payment_method)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor(true);
begin
  update public.households set payment_mode_override = p_mode, payment_method_override = p_method
  where id = p_household_id and vendor_id = vid;
  if not found then perform public.fail('not_your_customer'); end if;
end $$;

create function public.vendor_reset_invite(p_apartment_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor(true); code text := public.new_invite_code();
begin
  update public.vendor_apartments set invite_code = code where vendor_id = vid and apartment_id = p_apartment_id;
  if not found then perform public.fail('not_your_apartment'); end if;
  return code;
end $$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
create function public.admin_set_vendor_status(p_vendor_id uuid, p_status public.vendor_approval)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.vendors set approval_status = p_status,
    approved_at = case when p_status = 'active' then coalesce(approved_at, now()) else approved_at end
  where id = p_vendor_id;
  if not found then perform public.fail('vendor_not_found'); end if;
end $$;

create function public.admin_set_user_status(p_user_id uuid, p_status public.user_status)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if p_user_id = auth.uid() then perform public.fail('cannot_block_self'); end if;
  update public.users set status = p_status where id = p_user_id;
  if not found then perform public.fail('user_not_found'); end if;
end $$;

-- Moves households and vendor links from a duplicate into the surviving apartment.
create function public.admin_merge_apartments(p_from uuid, p_into uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if p_from = p_into then perform public.fail('same_apartment'); end if;
  if not exists (select 1 from public.apartments where id = p_into and status = 'active') then perform public.fail('apartment_not_found'); end if;
  update public.households set apartment_id = p_into where apartment_id = p_from;
  insert into public.vendor_apartments (vendor_id, apartment_id, delivery_window_start, delivery_window_end,
                                        payment_mode, payment_method, unpaid_limit, active)
  select vendor_id, p_into, delivery_window_start, delivery_window_end, payment_mode, payment_method, unpaid_limit, active
  from public.vendor_apartments where apartment_id = p_from
  on conflict (vendor_id, apartment_id) do nothing;
  delete from public.vendor_apartments where apartment_id = p_from;
  update public.apartments set status = 'merged', merged_into = p_into where id = p_from;
end $$;

create function public.admin_remove_apartment(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.apartments set status = 'removed' where id = p_id and status = 'active';
  if not found then perform public.fail('apartment_not_found'); end if;
end $$;

create function public.admin_set_report_status(p_report_id uuid, p_status public.report_status)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.reports set status = p_status,
    resolved_at = case when p_status = 'open' then null else now() end
  where id = p_report_id;
end $$;

-- ---------------------------------------------------------------------------
-- In-app notifications created by the database itself, so no code path can
-- forget them. The server sends the matching web push (src/lib/notify).
-- ---------------------------------------------------------------------------
create function public.notify(p_user_id uuid, p_type public.notification_type, p_payload jsonb, p_dedupe text)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, channel, payload, dedupe_key)
  values (p_user_id, p_type, 'in_app', p_payload, p_dedupe)
  on conflict (user_id, channel, dedupe_key) do nothing
$$;

create function public.orders_notify()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare uid uuid;
begin
  select user_id into uid from public.households where id = new.household_id;
  if new.status = 'accepted' and old.status = 'placed' then
    perform public.notify(uid, 'order_accepted', jsonb_build_object('orderId', new.id, 'deliveryDate', new.delivery_date), 'accepted:' || new.id);
  elsif new.status = 'delivered' and old.status <> 'delivered' then
    perform public.notify(uid, 'order_delivered',
      jsonb_build_object('orderId', new.id, 'deliveryDate', new.delivery_date, 'amount', new.final_total), 'delivered:' || new.id);
  end if;
  return new;
end $$;
create trigger orders_notify after update of status on public.orders
  for each row execute function public.orders_notify();

create function public.order_items_notify()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare uid uuid; oid uuid; dd date;
begin
  if new.available = false and old.available is distinct from false then
    select h.user_id, o.id, o.delivery_date into uid, oid, dd
    from public.orders o join public.households h on h.id = o.household_id where o.id = new.order_id;
    perform public.notify(uid, 'item_unavailable',
      jsonb_build_object('orderId', oid, 'deliveryDate', dd, 'catalogueItemId', new.catalogue_item_id), 'unavailable:' || new.id);
  end if;
  return new;
end $$;
create trigger order_items_notify after update of available on public.order_items
  for each row execute function public.order_items_notify();

create function public.vendors_notify()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.approval_status = 'active' and old.approval_status <> 'active' then
    perform public.notify(new.user_id, 'vendor_approved', '{}'::jsonb, 'approved:' || new.id || ':' || now()::date);
  end if;
  return new;
end $$;
create trigger vendors_notify after update of approval_status on public.vendors
  for each row execute function public.vendors_notify();

create function public.payments_notify()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare uid uuid;
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status <> 'confirmed') then
    select user_id into uid from public.households where id = new.household_id;
    perform public.notify(uid, 'payment_confirmed', jsonb_build_object('amount', new.amount), 'paid:' || new.id);
  end if;
  return new;
end $$;
create trigger payments_notify after insert or update of status on public.payments
  for each row execute function public.payments_notify();

-- ---------------------------------------------------------------------------
-- Privileges: helpers stay internal; app operations are for signed-in users.
-- ---------------------------------------------------------------------------
revoke execute on function public.fail(text), public.require_active_user(), public.require_vendor(boolean),
  public.require_admin(), public.recompute_order(uuid), public.household_ledger(uuid, uuid),
  public.notify(uuid, public.notification_type, jsonb, text), public.orders_notify(), public.order_items_notify(),
  public.vendors_notify(), public.payments_notify()
  from public, anon, authenticated;

revoke execute on function public.orders_lock_at(date), public.place_order(jsonb), public.cancel_my_order(uuid),
  public.claim_payment(numeric, public.payment_method, uuid), public.my_ledger(),
  public.vendor_accept_orders(date), public.vendor_set_item_available(uuid, boolean), public.vendor_pack_order(uuid, jsonb),
  public.vendor_mark_delivered(uuid), public.vendor_dues(), public.vendor_confirm_payment(uuid), public.vendor_reject_payment(uuid),
  public.vendor_record_cash(uuid, numeric), public.vendor_set_household_paused(uuid, boolean),
  public.vendor_set_household_terms(uuid, public.payment_mode, public.payment_method), public.vendor_reset_invite(uuid),
  public.admin_set_vendor_status(uuid, public.vendor_approval), public.admin_set_user_status(uuid, public.user_status),
  public.admin_merge_apartments(uuid, uuid), public.admin_remove_apartment(uuid), public.admin_set_report_status(uuid, public.report_status)
  from public, anon;

grant execute on function public.orders_lock_at(date), public.place_order(jsonb), public.cancel_my_order(uuid),
  public.claim_payment(numeric, public.payment_method, uuid), public.my_ledger(),
  public.vendor_accept_orders(date), public.vendor_set_item_available(uuid, boolean), public.vendor_pack_order(uuid, jsonb),
  public.vendor_mark_delivered(uuid), public.vendor_dues(), public.vendor_confirm_payment(uuid), public.vendor_reject_payment(uuid),
  public.vendor_record_cash(uuid, numeric), public.vendor_set_household_paused(uuid, boolean),
  public.vendor_set_household_terms(uuid, public.payment_mode, public.payment_method), public.vendor_reset_invite(uuid),
  public.admin_set_vendor_status(uuid, public.vendor_approval), public.admin_set_user_status(uuid, public.user_status),
  public.admin_merge_apartments(uuid, uuid), public.admin_remove_apartment(uuid), public.admin_set_report_status(uuid, public.report_status)
  to authenticated;
