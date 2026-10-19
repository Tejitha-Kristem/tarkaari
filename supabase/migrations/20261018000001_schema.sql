-- Tarakari core schema.
-- Money is numeric(10,2) rupees; quantities are numeric(8,3) in the item's unit.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'vendor', 'admin');
create type public.user_status as enum ('active', 'blocked');
create type public.app_language as enum ('en', 'kn');
create type public.apartment_status as enum ('active', 'merged', 'removed');
create type public.vendor_approval as enum ('pending', 'active', 'paused', 'blocked');
create type public.payment_mode as enum ('per_delivery', 'monthly');
create type public.payment_method as enum ('upi', 'cash');
create type public.item_unit as enum ('kg', 'g', 'piece', 'bunch', 'packet');
create type public.item_category as enum ('daily', 'vegetables', 'roots', 'leafy', 'other');
create type public.reason_tag as enum ('morning_market', 'farm_fresh', 'organic', 'seasonal');
create type public.order_status as enum ('placed', 'accepted', 'packed', 'delivered', 'cancelled');
create type public.payment_status as enum ('claimed', 'confirmed');
create type public.notification_channel as enum ('in_app', 'push', 'whatsapp', 'sms');
create type public.notification_type as enum (
  'booking_reminder',
  'order_accepted',
  'item_unavailable',
  'order_delivered',
  'payment_due',
  'payment_confirmed',
  'monthly_statement',
  'manual_reminder',
  'vendor_approved'
);
create type public.report_status as enum ('open', 'resolved', 'dismissed');

-- Prices for 'g' items are quoted per 100 g; every other unit per 1 unit.
create function public.unit_price_basis(u public.item_unit)
returns numeric
language sql immutable parallel safe
set search_path = ''
as $$ select case when u = 'g' then 100::numeric else 1::numeric end $$;

-- How much one tap of "+" adds.
create function public.default_step(u public.item_unit)
returns numeric
language sql immutable parallel safe
set search_path = ''
as $$ select case u when 'kg' then 0.25 when 'g' then 100 else 1 end::numeric $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per auth user, created by a trigger on auth.users.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  name text check (char_length(name) between 1 and 80),
  role public.user_role not null default 'customer',
  language public.app_language not null default 'en',
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.apartments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  area text not null check (char_length(btrim(area)) between 2 and 120),
  city text not null default 'Bengaluru' check (char_length(city) <= 60),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  house_count_estimate integer check (house_count_estimate between 1 and 50000),
  created_by uuid references public.users (id) on delete set null,
  status public.apartment_status not null default 'active',
  merged_into uuid references public.apartments (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apartments_merge_consistent check ((status = 'merged') = (merged_into is not null)),
  constraint apartments_not_merged_into_self check (merged_into <> id)
);
create index apartments_name_trgm on public.apartments using gin (name extensions.gin_trgm_ops);
create index apartments_area_trgm on public.apartments using gin (area extensions.gin_trgm_ops);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  shop_name text not null check (char_length(btrim(shop_name)) between 2 and 80),
  address text check (char_length(address) <= 300),
  shop_photo text,   -- object path in the public "shop-photos" bucket
  id_photo text,     -- object path in the private "id-photos" bucket
  upi_id text check (upi_id ~ '^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9]{2,64}$'),
  service_charge numeric(8, 2) not null default 0 check (service_charge between 0 and 500),
  approval_status public.vendor_approval not null default 'pending',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendor_apartments (
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  delivery_window_start time not null default '07:00',
  delivery_window_end time not null default '09:00',
  payment_mode public.payment_mode not null default 'per_delivery',
  payment_method public.payment_method not null default 'upi',
  unpaid_limit numeric(10, 2) not null default 1000 check (unpaid_limit >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (vendor_id, apartment_id),
  constraint vendor_apartments_window_order check (delivery_window_end > delivery_window_start)
);
create index vendor_apartments_apartment on public.vendor_apartments (apartment_id) where active;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  apartment_id uuid not null references public.apartments (id),
  flat_no text not null check (char_length(btrim(flat_no)) between 1 and 20),
  block text check (char_length(block) <= 20),
  vendor_id uuid references public.vendors (id) on delete set null,
  payment_mode_override public.payment_mode,
  payment_method_override public.payment_method,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index households_vendor on public.households (vendor_id);
create index households_apartment on public.households (apartment_id);

create table public.catalogue_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_kn text not null,
  photo text,  -- URL or path, e.g. /veg/tomato.svg
  default_unit public.item_unit not null,
  category public.item_category not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.vendor_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  catalogue_item_id uuid not null references public.catalogue_items (id),
  unit public.item_unit not null,
  step numeric(8, 3) not null check (step > 0),
  -- Per unit_price_basis(unit): per kg, per 100 g, per piece/bunch/packet.
  price_min numeric(8, 2) not null check (price_min > 0),
  price_max numeric(8, 2) not null,
  reason_tag public.reason_tag,
  available boolean not null default true,  -- in stock today
  listed boolean not null default true,     -- shown in the shop at all
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, catalogue_item_id),
  constraint vendor_items_price_range check (price_max >= price_min)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id),
  vendor_id uuid not null references public.vendors (id),
  apartment_id uuid not null references public.apartments (id),
  delivery_date date not null,
  status public.order_status not null default 'placed',
  service_charge numeric(8, 2) not null default 0 check (service_charge >= 0),
  est_min numeric(10, 2) not null default 0,
  est_max numeric(10, 2) not null default 0,
  final_total numeric(10, 2) check (final_total >= 0),
  placed_at timestamptz not null default now(),
  accepted_at timestamptz,
  packed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_estimate_range check (est_max >= est_min)
);
-- One live order per household per delivery day.
create unique index orders_one_per_household_day
  on public.orders (household_id, delivery_date) where status <> 'cancelled';
create index orders_vendor_day on public.orders (vendor_id, delivery_date);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  vendor_item_id uuid not null references public.vendor_items (id),
  catalogue_item_id uuid not null references public.catalogue_items (id),
  unit_snapshot public.item_unit not null,
  qty_ordered numeric(8, 3) not null check (qty_ordered > 0),
  price_min_snapshot numeric(8, 2) not null,
  price_max_snapshot numeric(8, 2) not null,
  available boolean,  -- null until the vendor decides
  qty_actual numeric(8, 3) check (qty_actual >= 0),
  final_price numeric(8, 2),
  line_total numeric(10, 2) generated always as (
    round(qty_actual * final_price / public.unit_price_basis(unit_snapshot), 2)
  ) stored,
  unique (order_id, vendor_item_id),
  constraint order_items_final_price_in_range
    check (final_price is null or final_price between price_min_snapshot and price_max_snapshot)
);
create index order_items_order on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id),
  vendor_id uuid not null references public.vendors (id),
  order_id uuid references public.orders (id),  -- null for monthly settlements
  amount numeric(10, 2) not null check (amount > 0),
  method public.payment_method not null,
  status public.payment_status not null default 'claimed',
  claimed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references public.users (id),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  constraint payments_confirmed_consistent check ((status = 'confirmed') = (confirmed_at is not null))
);
create index payments_vendor_household on public.payments (vendor_id, household_id);

create table public.vendor_holidays (
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  date date not null,
  primary key (vendor_id, date)
);

-- Channel-agnostic notification log. In-app rows double as the inbox; push,
-- WhatsApp and SMS rows record delivery attempts.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type public.notification_type not null,
  channel public.notification_channel not null default 'in_app',
  payload jsonb not null default '{}'::jsonb,  -- params for the translated message
  dedupe_key text,                             -- e.g. booking_reminder:2026-10-19
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  error text,
  unique (user_id, channel, dedupe_key)
);
create index notifications_user_inbox on public.notifications (user_id, created_at desc) where channel = 'in_app';

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.users (id) on delete cascade,
  about uuid references public.users (id) on delete set null,  -- the user being reported, if any
  order_id uuid references public.orders (id) on delete set null,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
