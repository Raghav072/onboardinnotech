-- ONBOARD Milestone 3, migration 0003: member discovery (search / filter / sort / paginate).
-- Apply MANUALLY after 0001 and 0002, to a development project first. Review before running.
-- Additive: no table, column, policy or grant from 0001/0002 is dropped or widened.
--
-- Design:
--   * public.search_public_profiles() is SECURITY INVOKER and reads ONLY public.public_profiles.
--     It therefore runs with the caller's own privileges: anon has no access to the view and
--     no EXECUTE on the function, and nothing here can reach profiles / private_profiles.
--   * The function returns a fixed allow-list of columns. No email, phone, role, is_public,
--     verification_status, bio or avatar path is returned.
--   * Inputs are bounded inside the function as well as in the app: text is trimmed and capped,
--     LIKE wildcards in user input are escaped, page size is clamped to 1..50 and the offset
--     to 0..10000. There is no dynamic SQL, so no input is ever interpreted as SQL.

-- 1. Members whose verification was rejected are not shown anywhere through the view.
--    (CREATE OR REPLACE keeps the existing grants: signed-in users only.)
create or replace view public.public_profiles
with (security_invoker = off, security_barrier = true) as
  select p.id, p.display_name, p.kind, p.programme, p.admission_year, p.graduation_year,
         p.company, p.job_title, p.bio, p.skills, p.open_to_mentoring, p.avatar_path,
         (p.verification_status = 'verified') as is_verified
  from public.profiles p
  where p.is_public
    and p.verification_status <> 'rejected';

-- 2. Helpers -------------------------------------------------------------------

-- Escape LIKE metacharacters so user text is matched literally.
create or replace function public.like_escape(t text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_');
$$;

-- Programme length in years, used only to decide which year-of-study a student can hold.
-- ASSUMPTION (see docs/academic-year.md): MBA is 2 years, everything else 4. Programme is
-- free text today; replace this with a stored, validated duration when one exists.
-- MUST stay in step with programmeDurationYears() in src/lib/discovery/person.ts.
create or replace function public.programme_duration_years(p text) returns smallint
language sql immutable set search_path = '' as $$
  select (case when p ~* '^\s*mba\y' then 2 else 4 end)::smallint;
$$;

-- 3. Search --------------------------------------------------------------------
-- p_admission_year + p_year_of_study are computed by the app with src/lib/academic-year.ts
-- (Asia/Kolkata, 1 July cutover) so the calendar rule lives in one place.
create or replace function public.search_public_profiles(
  p_kind            text,
  p_query           text    default null,   -- display-name contains
  p_programme       text    default null,   -- programme contains
  p_skill           text    default null,   -- any skill contains
  p_company         text    default null,   -- company contains
  p_admission_year  int     default null,   -- students: calendar admission year for the wanted year of study
  p_year_of_study   int     default null,   -- students: 1..4; must fit within the programme length
  p_graduation_year int     default null,   -- alumni
  p_mentoring       boolean default null,   -- true = only members open to mentoring
  p_sort            text    default 'name', -- name | name_desc | newest | oldest
  p_limit           int     default 12,
  p_offset          int     default 0
)
returns table (
  id                uuid,
  display_name      text,
  kind              text,
  programme         text,
  admission_year    smallint,
  graduation_year   smallint,
  company           text,
  job_title         text,
  skills            text[],
  open_to_mentoring boolean,
  is_verified       boolean,
  total_count       bigint
)
language sql stable security invoker set search_path = '' as $$
  with f as (
    select
      nullif(left(btrim(p_query), 100), '')     as q,
      nullif(left(btrim(p_programme), 100), '') as programme,
      nullif(left(btrim(p_skill), 100), '')     as skill,
      nullif(left(btrim(p_company), 100), '')   as company,
      case when p_sort in ('name', 'name_desc', 'newest', 'oldest') then p_sort else 'name' end as sort,
      least(greatest(coalesce(p_limit, 12), 1), 50)          as row_limit,
      least(greatest(coalesce(p_offset, 0), 0), 10000)       as row_offset
  )
  select v.id, v.display_name, v.kind, v.programme, v.admission_year, v.graduation_year,
         v.company, v.job_title, v.skills, v.open_to_mentoring, v.is_verified,
         count(*) over () as total_count
  from public.public_profiles v
  cross join f
  where v.kind = p_kind
    -- A profile that still holds nothing but the auto-generated display name (which can be
    -- derived from the sign-up email) is not listed. STOP-GAP: there is no onboarding-status
    -- column yet; see docs/supabase-setup.md, "Known limits".
    and (   v.programme is not null or v.admission_year is not null or v.graduation_year is not null
         or v.company is not null or v.job_title is not null or v.bio <> ''
         or cardinality(v.skills) > 0)
    and (f.q is null         or v.display_name ilike '%' || public.like_escape(f.q)         || '%' escape '\')
    and (f.programme is null or v.programme    ilike '%' || public.like_escape(f.programme) || '%' escape '\')
    and (f.company is null   or v.company      ilike '%' || public.like_escape(f.company)   || '%' escape '\')
    and (f.skill is null or exists (
          select 1 from unnest(v.skills) s
          where s ilike '%' || public.like_escape(f.skill) || '%' escape '\'))
    and (p_admission_year is null  or v.admission_year = p_admission_year)
    and (p_year_of_study is null   or p_year_of_study <= public.programme_duration_years(v.programme))
    and (p_graduation_year is null or v.graduation_year = p_graduation_year)
    and (p_mentoring is not true   or v.open_to_mentoring)
  order by
    case when f.sort = 'name_desc' then lower(v.display_name) end desc,
    case when f.sort = 'newest' then coalesce(v.graduation_year, v.admission_year) end desc nulls last,
    case when f.sort = 'oldest' then coalesce(v.graduation_year, v.admission_year) end asc nulls last,
    lower(v.display_name) asc,
    v.id asc
  limit (select row_limit from f)
  offset (select row_offset from f);
$$;

-- 4. Least privilege: signed-in users only. (The view itself already refuses anon.)
revoke all on function public.like_escape(text)                    from public, anon;
revoke all on function public.programme_duration_years(text)       from public, anon;
revoke all on function public.search_public_profiles(
  text, text, text, text, text, int, int, int, boolean, text, int, int) from public, anon;
grant execute on function public.like_escape(text)                 to authenticated;
grant execute on function public.programme_duration_years(text)    to authenticated;
grant execute on function public.search_public_profiles(
  text, text, text, text, text, int, int, int, boolean, text, int, int) to authenticated;
