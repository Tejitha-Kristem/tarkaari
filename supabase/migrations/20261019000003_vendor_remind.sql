-- Vendor sends a payment reminder to one household (at most once a day each).
create function public.vendor_remind(p_household_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare vid uuid := public.require_vendor(); h public.households; bal numeric;
begin
  select * into h from public.households where id = p_household_id and vendor_id = vid;
  if h.id is null then perform public.fail('not_your_customer'); end if;
  select l.balance - l.claimed into bal from public.household_ledger(h.id, vid) l;
  if coalesce(bal, 0) <= 0 then return; end if;
  perform public.notify(h.user_id, 'manual_reminder', jsonb_build_object('amount', bal),
    'remind:' || h.id || ':' || (public.app_now() at time zone 'Asia/Kolkata')::date);
end $$;

revoke execute on function public.vendor_remind(uuid) from public, anon;
grant execute on function public.vendor_remind(uuid) to authenticated;
