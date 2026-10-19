-- Photo storage. Object names are "<auth user id>/<file>" so ownership is the
-- first folder of the path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalogue', 'catalogue', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('shop-photos', 'shop-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('id-photos', 'id-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- catalogue: public read (bucket is public); only admins write.
create policy catalogue_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'catalogue' and (select public.is_admin()))
  with check (bucket_id = 'catalogue' and (select public.is_admin()));

-- shop-photos: public read; vendors manage files in their own folder.
create policy shop_photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy shop_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'shop-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy shop_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'shop-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- id-photos: private; only the vendor who uploaded it and admins can view.
create policy id_photos_owner_or_admin_select on storage.objects for select to authenticated
  using (
    bucket_id = 'id-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
create policy id_photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'id-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy id_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'id-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy id_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'id-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
