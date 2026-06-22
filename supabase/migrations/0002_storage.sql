-- =====================================================================
-- Storage buckets + policies
--   public-images : public read, admin write (course/blog/testimonial imgs)
--   chat-files    : private, per-user folder ('<auth.uid()>/<file>')
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('public-images', 'public-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-files', 'chat-files', false)
on conflict (id) do nothing;

-- public-images: anyone reads; only admin writes/updates/deletes ------
drop policy if exists img_read on storage.objects;
create policy img_read on storage.objects
  for select using (bucket_id = 'public-images');

drop policy if exists img_insert on storage.objects;
create policy img_insert on storage.objects
  for insert with check (bucket_id = 'public-images' and public.is_admin());

drop policy if exists img_update on storage.objects;
create policy img_update on storage.objects
  for update using (bucket_id = 'public-images' and public.is_admin());

drop policy if exists img_delete on storage.objects;
create policy img_delete on storage.objects
  for delete using (bucket_id = 'public-images' and public.is_admin());

-- chat-files: objects live under '<conversationId>/...'. A client may write to
-- their own conversation folder; the admin may write to any conversation folder.
drop policy if exists chat_insert on storage.objects;
create policy chat_insert on storage.objects
  for insert with check (
    bucket_id = 'chat-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists chat_read on storage.objects;
create policy chat_read on storage.objects
  for select using (
    bucket_id = 'chat-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
