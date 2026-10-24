-- ONBOARD Milestone 2, migration 0002: private `avatars` bucket and policies.
-- Apply MANUALLY after 0001. Requires Supabase Storage (schema `storage`).
--
-- Layout: avatars/<user_id>/<random>.<jpg|png|webp>
--   * Bucket is PRIVATE; the app serves avatars through short-lived signed URLs.
--   * Members can write/replace/delete only inside their own <user_id>/ folder.
--   * Members can read their own avatar, and the avatar of any is_public profile.
--   * 2 MiB limit and an image MIME allow-list are enforced by the bucket itself.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Can the caller see the avatar stored under this owner folder?
create or replace function public.can_view_avatar(folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select folder = (select auth.uid())::text
      or exists (
        select 1 from public.profiles p
        where p.id::text = folder and p.is_public and p.avatar_path is not null
      );
$$;
revoke all on function public.can_view_avatar(text) from public, anon;
grant execute on function public.can_view_avatar(text) to authenticated;

-- Object names must be exactly <own uid>/<safe file name>. This also blocks
-- nested paths and traversal-style names.
create policy avatars_read on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.can_view_avatar((storage.foldername(name))[1]));

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(jpg|png|webp)$'
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'avatars'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(jpg|png|webp)$'
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
