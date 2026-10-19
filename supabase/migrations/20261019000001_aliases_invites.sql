-- List-to-cart and WhatsApp invites.

-- ---------------------------------------------------------------------------
-- Other names for each item (spellings, Kannada in English letters, Hindi),
-- used to match typed or spoken lists such as "eerulli 2 kg, dhaniya 1".
-- ---------------------------------------------------------------------------
alter table public.catalogue_items add column aliases text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Invite links shared into existing WhatsApp groups.
--   /j/<vendor_apartments.invite_code>  join this vendor at this apartment
--   /j/<apartments.invite_code>         join this apartment, then pick a vendor
-- Codes are unguessable but harmless: they reveal only public names.
-- ---------------------------------------------------------------------------
create function public.new_invite_code()
returns text
language sql volatile
set search_path = ''
as $$ select substr(replace(gen_random_uuid()::text, '-', ''), 1, 10) $$;

alter table public.vendor_apartments
  add column invite_code text not null unique default public.new_invite_code();
alter table public.apartments
  add column invite_code text not null unique default public.new_invite_code();

-- Lets a vendor get a fresh link if an old one was shared too widely.
grant update (invite_code) on public.vendor_apartments to authenticated;

-- What a join page may show before the visitor has signed in.
create function public.resolve_invite(p_code text)
returns table (
  kind text,
  apartment_id uuid,
  apartment_name text,
  apartment_area text,
  vendor_id uuid,
  shop_name text,
  shop_photo text
)
language sql stable security definer
set search_path = ''
as $$
  select 'vendor', a.id, a.name, a.area, v.id, v.shop_name, v.shop_photo
  from public.vendor_apartments va
  join public.vendors v on v.id = va.vendor_id
  join public.apartments a on a.id = va.apartment_id
  where va.invite_code = p_code
    and va.active
    and v.approval_status = 'active'
    and a.status = 'active'
  union all
  select 'apartment', a.id, a.name, a.area, null, null, null
  from public.apartments a
  where a.invite_code = p_code and a.status = 'active'
  limit 1
$$;

-- Column defaults run as the inserting user, so signed-in users need this.
revoke execute on function public.new_invite_code() from public, anon;
grant execute on function public.new_invite_code() to authenticated;
revoke execute on function public.resolve_invite(text) from public;
grant execute on function public.resolve_invite(text) to anon, authenticated;
