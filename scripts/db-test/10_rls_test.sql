-- Behavioural tests for schema rules and row-level security.
-- Each check raises an exception on failure; ON_ERROR_STOP aborts the run.

create schema test;
grant usage on schema test to anon, authenticated;

create function test.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAILED: %', label; end if;
  raise notice 'ok: %', label;
end $$;

-- Runs sql as the current role and expects it to fail with the given SQLSTATE.
create function test.fails(sql text, expected_state text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAILED (no error): %', label;
exception when others then
  if sqlstate = 'P0001' and sqlerrm like 'FAILED%' then raise; end if;
  if sqlstate <> expected_state then
    raise exception 'FAILED (got % "%", wanted %): %', sqlstate, sqlerrm, expected_state, label;
  end if;
  raise notice 'ok: %', label;
end $$;

create function test.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true)
$$;

grant execute on all functions in schema test to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser, like the Supabase auth service would)
-- ---------------------------------------------------------------------------
\set cust_a '''aaaaaaaa-0000-0000-0000-00000000000a'''
\set cust_b '''bbbbbbbb-0000-0000-0000-00000000000b'''
\set vend_p '''cccccccc-0000-0000-0000-00000000000c'''
\set vend_w '''dddddddd-0000-0000-0000-00000000000d'''
\set admin  '''eeeeeeee-0000-0000-0000-00000000000e'''

insert into auth.users (id, phone, raw_user_meta_data) values
  (:cust_a, '919000000001', '{"language":"kn"}'),
  (:cust_b, '919000000002', '{}'),
  (:vend_p, '919000000003', '{}'),
  (:vend_w, '919000000004', '{}'),
  (:admin,  '919000000005', '{}');

select test.ok((select count(*) = 5 from public.users), 'auth sign-up creates public.users rows');
select test.ok((select language = 'kn' from public.users where id = :cust_a), 'language from sign-up metadata');
update public.users set role = 'admin' where id = :admin;

select test.ok((select count(*) >= 40 from public.catalogue_items), 'catalogue seeded with 40+ items');
select test.ok((select count(*) = 0 from public.catalogue_items where name_kn = '' or photo is null), 'every item has Kannada name and picture');

insert into public.apartments (id, name, area, created_by) values
  ('a0000000-0000-0000-0000-000000000001', 'Prestige Lakeside Habitat', 'Varthur', :cust_a),
  ('a0000000-0000-0000-0000-000000000002', 'Sobha Dream Acres', 'Panathur', :cust_b);

-- ---------------------------------------------------------------------------
-- Booking window in IST
-- ---------------------------------------------------------------------------
select test.ok((select phase = 'not_open' and delivery_date = '2026-10-20'
                from public.booking_state('2026-10-19 09:59+05:30')), '09:59 IST not open');
select test.ok((select phase = 'open' and closes_at = '2026-10-19 17:00+05:30'
                from public.booking_state('2026-10-19 10:00+05:30')), '10:00 IST open, closes 17:00');
select test.ok((select phase = 'open' from public.booking_state('2026-10-19 11:29:59+00')), '16:59:59 IST open (given in UTC)');
select test.ok((select phase = 'locked' and opens_at = '2026-10-20 10:00+05:30'
                from public.booking_state('2026-10-19 17:00+05:30')), '17:00 IST locked');
select test.ok((select phase = 'locked' and delivery_date = '2026-10-20'
                from public.booking_state('2026-10-19 23:59+05:30')), '23:59 IST still locked for tomorrow');
select test.ok(public.can_customer_edit('2026-10-20', '2026-10-19 12:00+05:30'), 'edit allowed during window');
select test.ok(not public.can_customer_edit('2026-10-20', '2026-10-19 17:01+05:30'), 'edit blocked after 5pm');
select test.ok(public.vendor_accept_deadline('2026-10-20') = '2026-10-19 21:00+05:30', 'vendor accept deadline 9pm IST');

-- ---------------------------------------------------------------------------
-- Vendor onboarding
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select test.act_as(:vend_p);
insert into public.vendors (id, user_id, shop_name, upi_id, service_charge)
  values ('f0000000-0000-0000-0000-00000000000c', :vend_p, 'Pending Veggies', 'pending@okaxis', 10);
select test.ok((select approval_status = 'pending' from public.vendors where user_id = :vend_p), 'new vendor is pending');
select test.ok((select role = 'vendor' from public.users where id = :vend_p), 'creating a vendor flips role to vendor');
select test.fails($$update public.vendors set approval_status = 'active'$$, '42501', 'vendor cannot approve self');
select test.fails($$update public.users set role = 'admin' where id = auth.uid()$$, '42501', 'user cannot change own role');
select test.fails(
  $$insert into public.vendors (user_id, shop_name) values ('dddddddd-0000-0000-0000-00000000000d', 'Hijack')$$,
  '42501', 'cannot create a vendor for someone else');
insert into public.vendor_apartments (vendor_id, apartment_id)
  values ('f0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000001');
commit;

begin;
set local role authenticated;
select test.act_as(:vend_w);
insert into public.vendors (id, user_id, shop_name, upi_id, service_charge)
  values ('f0000000-0000-0000-0000-00000000000d', :vend_w, 'Lakshmi Tarakari', 'lakshmi@okhdfcbank', 15);
insert into public.vendor_apartments (vendor_id, apartment_id, payment_mode)
  values ('f0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000001', 'monthly');
select test.fails(
  $$insert into public.vendor_apartments (vendor_id, apartment_id)
    values ('f0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000002')$$,
  '42501', 'vendor cannot add apartments for another vendor');
insert into public.vendor_items (id, vendor_id, catalogue_item_id, unit, price_min, price_max, reason_tag)
  select '10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-00000000000d', id, 'kg', 30, 40, 'morning_market'
  from public.catalogue_items where slug = 'tomato';
insert into public.vendor_items (id, vendor_id, catalogue_item_id, unit, price_min, price_max)
  select '10000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-00000000000d', id, 'g', 12, 15
  from public.catalogue_items where slug = 'ginger';
select test.ok((select step = 0.25 from public.vendor_items where id = '10000000-0000-0000-0000-000000000001'), 'kg step defaults to 0.25');
select test.ok((select step = 100 from public.vendor_items where id = '10000000-0000-0000-0000-000000000002'), 'g step defaults to 100');
select test.fails(
  $$insert into public.vendor_items (vendor_id, catalogue_item_id, unit, price_min, price_max)
    select 'f0000000-0000-0000-0000-00000000000d', id, 'kg', 50, 40 from public.catalogue_items where slug = 'onion'$$,
  '23514', 'price_max below price_min rejected');
commit;

-- Admin approves W (admin actions get dedicated functions in phase 3).
update public.vendors set approval_status = 'active', approved_at = now() where user_id = :vend_w;

-- ---------------------------------------------------------------------------
-- Customer onboarding and visibility
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select test.act_as(:cust_a);
select test.ok((select count(*) = 1 from public.search_apartments('prestige')), 'search finds apartment by partial name');
select test.ok((select count(*) = 1 from public.search_apartments('Varthur')), 'search finds apartment by area');
select test.ok((select count(*) = 1 from public.search_apartments('prestge lakesid')), 'search tolerates typos');
select test.fails(
  $$insert into public.apartments (name, area, created_by) values ('Fake', 'Nowhere', 'bbbbbbbb-0000-0000-0000-00000000000b')$$,
  '42501', 'cannot add apartment as someone else');
select test.fails(
  $$insert into public.apartments (name, area, created_by, status) values ('X Towers', 'HSR', auth.uid(), 'removed')$$,
  '42501', 'cannot set apartment status');
select test.ok((select count(*) = 1 from public.vendors), 'customer sees only approved vendors');
select test.ok((select count(*) = 1 from public.vendor_apartments), 'customer sees only approved vendors'' apartments');
select test.fails(
  $$insert into public.households (user_id, apartment_id, flat_no, vendor_id)
    values (auth.uid(), 'a0000000-0000-0000-0000-000000000001', 'A-101', 'f0000000-0000-0000-0000-00000000000c')$$,
  'P0001', 'cannot pick a pending vendor');
select test.fails(
  $$insert into public.households (user_id, apartment_id, flat_no, vendor_id)
    values (auth.uid(), 'a0000000-0000-0000-0000-000000000002', 'A-101', 'f0000000-0000-0000-0000-00000000000d')$$,
  'P0001', 'cannot pick a vendor that does not serve the apartment');
insert into public.households (id, user_id, apartment_id, flat_no, block, vendor_id)
  values ('b0000000-0000-0000-0000-00000000000a', auth.uid(), 'a0000000-0000-0000-0000-000000000001', '101', 'A',
          'f0000000-0000-0000-0000-00000000000d');
select test.fails($$update public.households set paused = false$$, '42501', 'customer cannot un-pause self');
select test.fails($$update public.households set payment_mode_override = 'monthly'$$, '42501', 'customer cannot override payment terms');
select test.fails(
  $$insert into public.orders (household_id, vendor_id, apartment_id, delivery_date)
    values ('b0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-00000000000d',
            'a0000000-0000-0000-0000-000000000001', current_date + 1)$$,
  '42501', 'customer cannot write orders directly');
select test.fails(
  $$insert into public.payments (household_id, vendor_id, amount, method, status, confirmed_at)
    values ('b0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-00000000000d', 100, 'upi', 'confirmed', now())$$,
  '42501', 'customer cannot confirm own payment');
select test.ok((select count(*) = 1 from public.users where id = :vend_w), 'customer sees own vendor''s name and phone');
select test.ok((select count(*) = 0 from public.users where id in (:cust_b, :vend_p, :admin)), 'customer cannot see other users');
select test.ok((select count(*) = 2 from public.vendor_items), 'customer sees approved vendor''s items');
commit;

begin;
set local role authenticated;
select test.act_as(:cust_b);
insert into public.households (id, user_id, apartment_id, flat_no)
  values ('b0000000-0000-0000-0000-00000000000b', auth.uid(), 'a0000000-0000-0000-0000-000000000002', '7');
select test.ok((select count(*) = 1 from public.households), 'customer sees only own household');
select test.fails($$update public.households set user_id = auth.uid() where id = 'b0000000-0000-0000-0000-00000000000a'$$,
  '42501', 'cannot take over another household');
commit;

-- An order created by the (future) place_order function, simulated as superuser.
insert into public.orders (id, household_id, vendor_id, apartment_id, delivery_date, service_charge, est_min, est_max)
  values ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000a',
          'f0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000001', '2026-10-20', 15, 60, 80);
insert into public.order_items (id, order_id, vendor_item_id, catalogue_item_id, unit_snapshot, qty_ordered,
                                price_min_snapshot, price_max_snapshot)
  select 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', vi.id, vi.catalogue_item_id,
         vi.unit, 2, vi.price_min, vi.price_max
  from public.vendor_items vi where vi.id = '10000000-0000-0000-0000-000000000001';
insert into public.order_items (id, order_id, vendor_item_id, catalogue_item_id, unit_snapshot, qty_ordered,
                                price_min_snapshot, price_max_snapshot)
  select 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', vi.id, vi.catalogue_item_id,
         vi.unit, 200, vi.price_min, vi.price_max
  from public.vendor_items vi where vi.id = '10000000-0000-0000-0000-000000000002';

update public.order_items set qty_actual = 2.1, final_price = 35 where id = 'd0000000-0000-0000-0000-000000000001';
update public.order_items set qty_actual = 250, final_price = 14 where id = 'd0000000-0000-0000-0000-000000000002';
select test.ok((select line_total = 73.50 from public.order_items where id = 'd0000000-0000-0000-0000-000000000001'), 'kg line total = 2.1 × 35');
select test.ok((select line_total = 35.00 from public.order_items where id = 'd0000000-0000-0000-0000-000000000002'), 'g line total priced per 100 g');
select test.fails($$update public.order_items set final_price = 45 where id = 'd0000000-0000-0000-0000-000000000001'$$,
  '23514', 'final price outside range rejected');
select test.fails($$insert into public.orders (household_id, vendor_id, apartment_id, delivery_date)
    values ('b0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-00000000000d',
            'a0000000-0000-0000-0000-000000000001', '2026-10-20')$$,
  '23505', 'only one live order per household per day');

begin;
set local role authenticated;
select test.act_as(:cust_a);
select test.ok((select count(*) = 1 from public.orders), 'customer sees own order');
select test.ok((select count(*) = 2 from public.order_items), 'customer sees own order items');
commit;

begin;
set local role authenticated;
select test.act_as(:cust_b);
select test.ok((select count(*) = 0 from public.orders), 'other customer cannot see the order');
select test.ok((select count(*) = 0 from public.order_items), 'other customer cannot see order items');
commit;

begin;
set local role authenticated;
select test.act_as(:vend_w);
select test.ok((select count(*) = 1 from public.orders), 'vendor sees orders placed with them');
select test.ok((select count(*) = 1 from public.households), 'vendor sees own customers'' households');
select test.ok((select count(*) = 1 from public.users where id = :cust_a), 'vendor sees own customer''s name and phone');
select test.ok((select count(*) = 0 from public.users where id = :cust_b), 'vendor cannot see non-customers');
select test.fails($$update public.households set paused = true$$, '42501', 'vendor pauses only via function (phase 6)');
commit;

begin;
set local role authenticated;
select test.act_as(:vend_p);
select test.ok((select count(*) = 0 from public.orders), 'unrelated vendor sees no orders');
select test.ok((select count(*) = 2 from public.vendor_items), 'approved vendors'' prices are visible to signed-in users');
commit;

begin;
set local role authenticated;
select test.act_as(:admin);
select test.ok((select count(*) = 2 from public.vendors), 'admin sees all vendors');
select test.ok((select count(*) = 5 from public.users), 'admin sees all users');
select test.ok((select count(*) = 1 from public.orders), 'admin sees all orders');
commit;

-- ---------------------------------------------------------------------------
-- Notifications, reports, anon
-- ---------------------------------------------------------------------------
insert into public.notifications (user_id, type, payload, dedupe_key)
  values (:cust_a, 'order_accepted', '{"orderId":"c0000000-0000-0000-0000-000000000001"}', 'accepted:c0000000');
select test.fails($$insert into public.notifications (user_id, type, dedupe_key)
    values ('aaaaaaaa-0000-0000-0000-00000000000a', 'order_accepted', 'accepted:c0000000')$$,
  '23505', 'notification dedupe key prevents repeats');

begin;
set local role authenticated;
select test.act_as(:cust_b);
select test.ok((select count(*) = 0 from public.notifications), 'cannot read others'' notifications');
insert into public.reports (from_user, about, text) values (auth.uid(), :vend_w, 'Late delivery');
select test.fails($$update public.reports set status = 'resolved'$$, '42501', 'reporter cannot resolve report');
commit;

begin;
set local role authenticated;
select test.act_as(:cust_a);
update public.notifications set read_at = now();
select test.ok((select read_at is not null from public.notifications), 'user marks own notification read');
select test.fails($$update public.notifications set type = 'payment_due'$$, '42501', 'user cannot rewrite notifications');
commit;

begin;
set local role anon;
select test.ok((select count(*) >= 40 from public.catalogue_items), 'anon can browse catalogue');
select test.fails($$select * from public.users$$, '42501', 'anon cannot read users');
select test.fails($$select * from public.apartments$$, '42501', 'anon cannot read apartments');
commit;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
select test.ok((select count(*) = 3 from storage.buckets), 'three buckets created');
select test.ok((select not public from storage.buckets where id = 'id-photos'), 'id-photos bucket is private');
insert into storage.objects (bucket_id, name) values ('id-photos', 'cccccccc-0000-0000-0000-00000000000c/id.jpg');

begin;
set local role authenticated;
select test.act_as(:vend_p);
select test.ok((select count(*) = 1 from storage.objects where bucket_id = 'id-photos'), 'vendor reads own ID photo');
select test.fails($$insert into storage.objects (bucket_id, name) values ('id-photos', 'dddddddd-0000-0000-0000-00000000000d/x.jpg')$$,
  '42501', 'cannot upload into another user''s folder');
select test.fails($$insert into storage.objects (bucket_id, name) values ('catalogue', 'tomato.jpg')$$,
  '42501', 'non-admin cannot upload catalogue photos');
commit;

begin;
set local role authenticated;
select test.act_as(:cust_a);
select test.ok((select count(*) = 0 from storage.objects where bucket_id = 'id-photos'), 'customer cannot read vendor ID photos');
commit;

begin;
set local role authenticated;
select test.act_as(:admin);
select test.ok((select count(*) = 1 from storage.objects where bucket_id = 'id-photos'), 'admin reads vendor ID photos');
commit;

-- ---------------------------------------------------------------------------
-- Aliases and WhatsApp invites
-- ---------------------------------------------------------------------------
select test.ok((select count(*) = 0 from public.catalogue_items where cardinality(aliases) = 0), 'every item has other names');
select test.ok((select 'dhaniya' = any(aliases) from public.catalogue_items where slug = 'coriander'), 'coriander knows "dhaniya"');

select invite_code as code_w from public.vendor_apartments where vendor_id = 'f0000000-0000-0000-0000-00000000000d' \gset
select invite_code as code_p from public.vendor_apartments where vendor_id = 'f0000000-0000-0000-0000-00000000000c' \gset
select invite_code as code_apt from public.apartments where id = 'a0000000-0000-0000-0000-000000000002' \gset

begin;
set local role anon;
select test.ok((select kind = 'vendor' and shop_name = 'Lakshmi Tarakari' and apartment_name = 'Prestige Lakeside Habitat'
                from public.resolve_invite(:'code_w')),
               'anon resolves an approved vendor''s invite');
select test.ok((select count(*) = 0 from public.resolve_invite(:'code_p')),
               'pending vendor''s invite reveals nothing');
select test.ok((select kind = 'apartment' and vendor_id is null
                from public.resolve_invite(:'code_apt')),
               'apartment invite resolves without a vendor');
select test.ok((select count(*) = 0 from public.resolve_invite('nope')), 'unknown code resolves to nothing');
select test.fails($$select * from public.vendor_apartments$$, '42501', 'anon still cannot list vendor apartments');
commit;

begin;
set local role authenticated;
select test.act_as(:vend_w);
update public.vendor_apartments set invite_code = 'fresh12345' where vendor_id = 'f0000000-0000-0000-0000-00000000000d';
select test.ok((select count(*) = 1 from public.vendor_apartments where invite_code = 'fresh12345'), 'vendor can reset own invite link');
update public.vendor_apartments set invite_code = 'stolen1234' where vendor_id = 'f0000000-0000-0000-0000-00000000000c';
commit;
select test.ok((select count(*) = 0 from public.vendor_apartments where invite_code = 'stolen1234'), 'vendor cannot reset another vendor''s link');
