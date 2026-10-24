-- ONBOARD Milestone 2, migration 0001: profiles, privacy, privileged fields.
-- Apply MANUALLY (Supabase SQL editor or `supabase db push` against a project you
-- control). Review before running. Nothing here is executed by the application.
--
-- Design:
--   * public.profiles           member-editable profile + privileged columns
--                               (role, verification_status) that members cannot change.
--   * public.private_profiles   email / phone. Owner-only. Never in the public view.
--   * public.public_profiles    VIEW exposing only safe columns of is_public profiles,
--                               to signed-in users only (anon has no access).
--   * Row creation happens ONLY in a trigger on auth.users; clients cannot INSERT/DELETE.

-- ---------------------------------------------------------------- tables ----
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text        not null check (char_length(display_name) between 1 and 80),
  kind               text        not null default 'student' check (kind in ('student', 'alumni')),
  programme          text        check (programme is null or char_length(programme) <= 100),
  admission_year     smallint    check (admission_year is null or admission_year between 2000 and 2100),
  graduation_year    smallint    check (graduation_year is null or graduation_year between 2000 and 2100),
  company            text        check (company is null or char_length(company) <= 100),
  job_title          text        check (job_title is null or char_length(job_title) <= 100),
  bio                text        not null default '' check (char_length(bio) <= 500),
  skills             text[]      not null default '{}' check (cardinality(skills) <= 20),
  open_to_mentoring  boolean     not null default false,
  avatar_path        text,
  is_public          boolean     not null default true,
  -- Privileged: members can never write these (grants + trigger below).
  role               text        not null default 'member' check (role in ('member', 'moderator', 'admin')),
  verification_status text       not null default 'unverified'
                                 check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- File ownership: an avatar path must live in the owner's own folder.
  constraint profiles_avatar_path_owned check (
    avatar_path is null
    or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9_-]{1,64}\.(jpg|png|webp)$')
  )
);

create table public.private_profiles (
  id         uuid primary key references public.profiles (id) on delete cascade,
  email      text        not null,
  phone      text        check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------- functions ----
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- True only for a signed-in admin. SECURITY DEFINER so it can read profiles
-- regardless of the caller's RLS. Reads the DB role, never JWT user_metadata.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Create the profile rows when a user signs up. The display name comes from
-- user-controlled signup metadata, so it is trimmed and length-limited; role and
-- verification are NEVER read from metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  v_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80);
  if v_name = '' then
    v_name := left(btrim(split_part(coalesce(new.email, ''), '@', 1)), 80);
  end if;
  if v_name = '' then
    v_name := 'New member';
  end if;
  insert into public.profiles (id, display_name) values (new.id, v_name);
  insert into public.private_profiles (id, email) values (new.id, coalesce(new.email, ''));
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the private email copy in step with auth.users.
create or replace function public.sync_user_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.private_profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;
revoke all on function public.sync_user_email() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_user_email();

-- Defence in depth for privileged fields. Column grants already stop members
-- writing these; this trigger also stops them if a grant is ever widened by mistake.
-- Direct SQL / service role (auth.uid() is null) and admins may change them.
create or replace function public.protect_profile_privileged() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    if new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.verification_status is distinct from old.verification_status
       or new.created_at is distinct from old.created_at then
      raise exception 'not allowed to change privileged profile fields'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_protect_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger private_profiles_touch before update on public.private_profiles
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------------- RLS ---
alter table public.profiles         enable row level security;
alter table public.private_profiles enable row level security;

-- Own row only on the base table. Other members are read through public_profiles.
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- Admins may moderate (role / verification). Column grants below still limit
-- what the API role can touch; see the note at the grants.
create policy profiles_admin_select on public.profiles
  for select to authenticated using (public.is_admin());
create policy profiles_admin_update on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy private_select_own on public.private_profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy private_update_own on public.private_profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ----------------------------------------------------------------- grants ---
revoke all on public.profiles, public.private_profiles from public, anon, authenticated;

grant select on public.profiles to authenticated;
-- Members may update ONLY these columns. role / verification_status / id / created_at
-- are deliberately absent, so a member UPDATE touching them fails with 42501.
-- Admin changes to privileged columns are made with the service role or the SQL
-- editor (auth.uid() is null there), not through the browser API.
grant update (display_name, kind, programme, admission_year, graduation_year, company,
              job_title, bio, skills, open_to_mentoring, avatar_path, is_public)
  on public.profiles to authenticated;

grant select on public.private_profiles to authenticated;
-- email is NOT updatable by members: it is owned by auth.users.
grant update (phone) on public.private_profiles to authenticated;

-- ------------------------------------------------------------ public view ---
-- Owner-run view (security_invoker = off) so it can read other members' rows, but it
-- selects only safe columns and only is_public rows. No email, phone, role or
-- verification internals. Signed-in users only.
create view public.public_profiles
with (security_invoker = off, security_barrier = true) as
  select p.id, p.display_name, p.kind, p.programme, p.admission_year, p.graduation_year,
         p.company, p.job_title, p.bio, p.skills, p.open_to_mentoring, p.avatar_path,
         (p.verification_status = 'verified') as is_verified
  from public.profiles p
  where p.is_public;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to authenticated;
