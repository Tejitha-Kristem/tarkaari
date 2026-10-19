-- End-to-end business rules, run after 10_rls_test.sql (reuses its fixtures).
-- The clock is pinned with app.fake_now to walk through one ordering day.

create function test.fails_with(sql text, expected_code text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAILED (no error): %', label;
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if;
  if sqlerrm <> expected_code then
    raise exception 'FAILED (got % "%", wanted %): %', sqlstate, sqlerrm, expected_code, label;
  end if;
  raise notice 'ok: %', label;
end $$;
grant execute on function test.fails_with(text, text, text) to authenticated;

\set cust_a '''aaaaaaaa-0000-0000-0000-00000000000a'''
\set cust_b '''bbbbbbbb-0000-0000-0000-00000000000b'''
\set vend_p '''cccccccc-0000-0000-0000-00000000000c'''
\set vend_w '''dddddddd-0000-0000-0000-00000000000d'''
\set admin  '''eeeeeeee-0000-0000-0000-00000000000e'''
\set tomato '''10000000-0000-0000-0000-000000000001'''
\set ginger '''10000000-0000-0000-0000-000000000002'''

-- Reset the hand-made order from the RLS test; place_order owns orders now.
delete from public.order_items; delete from public.orders; delete from public.notifications;

-- ---------------------------------------------------------------- 12:00 IST, window open
select set_config('app.fake_now', '2026-10-19 12:00+05:30', false);

begin;
set local role authenticated;
select test.act_as(:cust_a);
select test.ok(public.place_order(jsonb_build_array(
  jsonb_build_object('vendor_item_id', :tomato, 'qty', 1),
  jsonb_build_object('vendor_item_id', :ginger, 'qty', 200))) is not null, 'customer places order in window');
select test.ok((select delivery_date = '2026-10-20' and est_min = 69 and est_max = 85 and service_charge = 15 from public.orders),
  'order is for tomorrow; estimate = items range + ₹15 service');
select public.place_order(jsonb_build_array(jsonb_build_object('vendor_item_id', :tomato, 'qty', 2)));
select test.ok((select count(*) = 1 from public.orders where status <> 'cancelled'), 'editing replaces the same order');
select test.ok((select count(*) = 1 from public.order_items), 'edited order has only the new items');
select public.place_order(jsonb_build_array(
  jsonb_build_object('vendor_item_id', :tomato, 'qty', 1),
  jsonb_build_object('vendor_item_id', :ginger, 'qty', 200)));
select test.fails_with($$select public.place_order('[{"vendor_item_id":"10000000-0000-0000-0000-0000000000ff","qty":1}]')$$,
  'item_unavailable', 'unknown item rejected');
select test.fails_with($$select public.vendor_dues()$$, 'not_a_vendor', 'customer cannot read vendor dues');
commit;

begin;
set local role authenticated;
select test.act_as(:cust_b);
select test.fails_with($$select public.place_order('[{"vendor_item_id":"10000000-0000-0000-0000-000000000001","qty":1}]')$$,
  'no_vendor', 'household without vendor cannot order');
commit;

begin;
set local role authenticated;
select test.act_as(:vend_w);
select test.fails_with($$select public.vendor_accept_orders('2026-10-20')$$, 'booking_still_open', 'vendor cannot accept before 5 pm');
commit;

-- ---------------------------------------------------------------- 17:01 IST, locked
select set_config('app.fake_now', '2026-10-19 17:01+05:30', false);

begin;
set local role authenticated;
select test.act_as(:cust_a);
select test.fails_with($$select public.place_order('[{"vendor_item_id":"10000000-0000-0000-0000-000000000001","qty":3}]')$$,
  'booking_closed', 'no edits after 5 pm');
select test.fails_with(format('select public.cancel_my_order(%L)', (select id from public.orders limit 1)),
  'order_locked', 'no cancelling after 5 pm');
commit;

begin;
set local role authenticated;
select test.act_as(:vend_p);
select test.fails_with($$select public.vendor_accept_orders('2026-10-20')$$, 'vendor_not_active', 'pending vendor cannot accept');
commit;

begin;
set local role authenticated;
select test.act_as(:vend_w);
select test.ok(public.vendor_accept_orders('2026-10-20') = 1, 'vendor accepts all orders');
select public.vendor_set_item_available((select id from public.order_items where vendor_item_id = :ginger), false);
select test.ok((select est_min = 45 and est_max = 55 from public.orders), 'unticked item drops out of estimate');
select test.fails_with(format($f$select public.vendor_pack_order(%L, '[{"order_item_id":"%s","qty_actual":1.1,"final_price":45}]')$f$,
  (select id from public.orders limit 1), (select id from public.order_items where vendor_item_id = :tomato)),
  'new row for relation "order_items" violates check constraint "order_items_final_price_in_range"', 'price outside range rejected');
select test.ok(public.vendor_pack_order((select id from public.orders limit 1),
  jsonb_build_array(jsonb_build_object('order_item_id', (select id from public.order_items where vendor_item_id = :tomato),
                                       'qty_actual', 1.1, 'final_price', 35))) = 53.50, 'packing totals actual weight × price + service');
select public.vendor_mark_delivered((select id from public.orders limit 1));
select test.ok((select status = 'delivered' from public.orders), 'order delivered');
commit;

select test.ok((select array_agg(type::text order by created_at) = array['order_accepted', 'item_unavailable', 'order_delivered']
                from public.notifications where user_id = :cust_a), 'customer notified: accepted, unavailable, delivered');

-- ---------------------------------------------------------------- Payments
begin;
set local role authenticated;
select test.act_as(:cust_a);
select test.ok((select balance = 53.50 and billed = 53.50 from public.my_ledger()), 'customer owes the bill');
select public.claim_payment(53.50, 'upi', (select id from public.orders limit 1));
select test.ok((select balance = 53.50 and claimed = 53.50 from public.my_ledger()), 'claim is not paid until confirmed');
select test.fails_with($$select public.vendor_confirm_payment((select id from public.payments limit 1))$$, 'not_a_vendor', 'customer cannot confirm');
commit;

begin;
set local role authenticated;
select test.act_as(:vend_w);
select test.ok((select pending_amount = 53.50 and balance = 53.50 from public.vendor_dues() where flat_no = '101'), 'vendor sees claimed payment');
select public.vendor_confirm_payment((select pending_payment_id from public.vendor_dues() where flat_no = '101'));
select test.ok((select balance = 0 from public.vendor_dues() where flat_no = '101'), 'confirmed payment clears balance');
select test.fails_with($$select public.vendor_record_cash('b0000000-0000-0000-0000-00000000000b', 100)$$, 'not_your_customer', 'cannot record cash for others');
select public.vendor_set_household_paused('b0000000-0000-0000-0000-00000000000a', true);
commit;
select test.ok((select count(*) = 1 from public.notifications where user_id = :cust_a and type = 'payment_confirmed'), 'customer notified of payment');

-- ---------------------------------------------------------------- Next day: pause, cancel
select set_config('app.fake_now', '2026-10-20 12:00+05:30', false);
begin;
set local role authenticated;
select test.act_as(:cust_a);
select test.fails_with($$select public.place_order('[{"vendor_item_id":"10000000-0000-0000-0000-000000000001","qty":1}]')$$,
  'household_paused', 'paused household cannot order');
commit;

begin;
set local role authenticated;
select test.act_as(:vend_w);
select public.vendor_set_household_paused('b0000000-0000-0000-0000-00000000000a', false);
insert into public.vendor_holidays (vendor_id, date) values ('f0000000-0000-0000-0000-00000000000d', '2026-10-21');
commit;

begin;
set local role authenticated;
select test.act_as(:cust_a);
select test.fails_with($$select public.place_order('[{"vendor_item_id":"10000000-0000-0000-0000-000000000001","qty":1}]')$$,
  'vendor_holiday', 'vendor holiday blocks ordering');
commit;
delete from public.vendor_holidays;

begin;
set local role authenticated;
select test.act_as(:cust_a);
select public.cancel_my_order(public.place_order('[{"vendor_item_id":"10000000-0000-0000-0000-000000000001","qty":1}]'));
select test.ok((select status = 'cancelled' from public.orders where delivery_date = '2026-10-21'), 'customer cancels within window');
commit;

-- ---------------------------------------------------------------- Admin
begin;
set local role authenticated;
select test.act_as(:vend_w);
select test.fails_with($$select public.admin_set_vendor_status('f0000000-0000-0000-0000-00000000000c', 'active')$$, 'not_admin', 'vendor cannot approve vendors');
commit;

begin;
set local role authenticated;
select test.act_as(:admin);
select public.admin_set_vendor_status('f0000000-0000-0000-0000-00000000000c', 'active');
select public.admin_merge_apartments('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001');
commit;
select test.ok((select approval_status = 'active' from public.vendors where id = 'f0000000-0000-0000-0000-00000000000c'), 'admin approves vendor');
select test.ok((select count(*) = 1 from public.notifications where user_id = :vend_p and type = 'vendor_approved'), 'vendor notified of approval');
select test.ok((select apartment_id = 'a0000000-0000-0000-0000-000000000001' from public.households where id = 'b0000000-0000-0000-0000-00000000000b'), 'merge moves households');
select test.ok((select status = 'merged' and merged_into = 'a0000000-0000-0000-0000-000000000001' from public.apartments where id = 'a0000000-0000-0000-0000-000000000002'), 'duplicate marked merged');

begin;
set local role anon;
select test.fails($$select public.place_order('[]')$$, '42501', 'anon cannot call operations');
commit;
