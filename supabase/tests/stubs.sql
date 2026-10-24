-- LOCAL TEST STUBS ONLY. Never apply to a real Supabase project: it already has
-- these schemas. This mimics just enough of Supabase (roles, auth.users, auth.uid(),
-- storage.buckets/objects, storage.foldername) to exercise our migrations in a
-- throwaway local PostgreSQL.
do $$ begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then execute 'create role anon nologin'; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then execute 'create role authenticated nologin'; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then execute 'create role service_role nologin bypassrls'; end if;
end $$;
create schema auth; create schema storage;
grant usage on schema auth, storage, public to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(), email text,
  raw_user_meta_data jsonb not null default '{}', raw_app_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
