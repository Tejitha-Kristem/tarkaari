-- Scheduled reminders. Called by the Vercel Cron routes with the service role;
-- each writes in-app notifications (deduped, so re-running is harmless) and
-- returns how many it created. The app then pushes them (src/lib/notify/push.ts).

alter type public.notification_type add value if not exists 'accept_reminder';

-- 15:30 IST: customers with a vendor who haven't ordered for tomorrow yet.
create function public.cron_booking_reminders()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare b record; n int;
begin
  select * into b from public.booking_state();
  if b.phase <> 'open' then return 0; end if;
  insert into public.notifications (user_id, type, channel, payload, dedupe_key)
  select h.user_id, 'booking_reminder', 'in_app', jsonb_build_object('deliveryDate', b.delivery_date),
         'booking:' || b.delivery_date
  from public.households h
  join public.users u on u.id = h.user_id and u.status = 'active'
  join public.vendors v on v.id = h.vendor_id and v.approval_status = 'active'
  where not h.paused
    and not exists (select 1 from public.vendor_holidays vh where vh.vendor_id = v.id and vh.date = b.delivery_date)
    and not exists (select 1 from public.orders o where o.household_id = h.id and o.delivery_date = b.delivery_date and o.status <> 'cancelled')
  on conflict (user_id, channel, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- 19:00 IST: vendors who still have orders to accept for tomorrow (deadline 21:00).
create function public.cron_accept_reminders()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare d date := (public.app_now() at time zone 'Asia/Kolkata')::date + 1; n int;
begin
  insert into public.notifications (user_id, type, channel, payload, dedupe_key)
  select v.user_id, 'accept_reminder', 'in_app', jsonb_build_object('deliveryDate', d, 'count', count(*)), 'accept:' || d
  from public.orders o join public.vendors v on v.id = o.vendor_id
  where o.delivery_date = d and o.status = 'placed'
  group by v.user_id
  on conflict (user_id, channel, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- 18:00 IST: per-delivery customers with an unpaid balance (one nudge a day at most,
-- and only once a bill is at least a day old).
create function public.cron_payment_due()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare today date := (public.app_now() at time zone 'Asia/Kolkata')::date; n int;
begin
  insert into public.notifications (user_id, type, channel, payload, dedupe_key)
  select h.user_id, 'payment_due', 'in_app', jsonb_build_object('amount', l.balance - l.claimed), 'due:' || h.id || ':' || today
  from public.households h
  join public.vendor_apartments va on va.vendor_id = h.vendor_id and va.apartment_id = h.apartment_id
  cross join lateral public.household_ledger(h.id, h.vendor_id) l
  where coalesce(h.payment_mode_override, va.payment_mode) = 'per_delivery'
    and l.balance - l.claimed > 0
    and l.oldest_unpaid < today
  on conflict (user_id, channel, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- 1st of the month, 09:00 IST: monthly-bill customers get their statement.
create function public.cron_monthly_statements()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare month text := to_char(public.app_now() at time zone 'Asia/Kolkata', 'YYYY-MM'); n int;
begin
  insert into public.notifications (user_id, type, channel, payload, dedupe_key)
  select h.user_id, 'monthly_statement', 'in_app', jsonb_build_object('amount', l.balance - l.claimed), 'monthly:' || h.id || ':' || month
  from public.households h
  join public.vendor_apartments va on va.vendor_id = h.vendor_id and va.apartment_id = h.apartment_id
  cross join lateral public.household_ledger(h.id, h.vendor_id) l
  where coalesce(h.payment_mode_override, va.payment_mode) = 'monthly'
    and l.balance - l.claimed > 0
  on conflict (user_id, channel, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.cron_booking_reminders(), public.cron_accept_reminders(),
  public.cron_payment_due(), public.cron_monthly_statements() from public, anon, authenticated;
grant execute on function public.cron_booking_reminders(), public.cron_accept_reminders(),
  public.cron_payment_due(), public.cron_monthly_statements() to service_role;
