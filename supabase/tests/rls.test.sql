-- RLS / grants / trigger / storage tests. Run via scripts/test-db.sh against a
-- THROWAWAY LOCAL PostgreSQL only. Any failed assertion aborts with a non-zero exit.
-- Users: A = ...0a (member), B = ...0b (member), C = ...0c (becomes admin).
\set ON_ERROR_STOP on

create function public.t_fail(q text, want text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'T_UNEXPECTED_SUCCESS (wanted %): %', want, q;
exception when others then
  if sqlerrm like 'T_UNEXPECTED_SUCCESS%' then raise; end if;
  if sqlstate <> want then raise exception 'wrong sqlstate % (%) wanted % for: %', sqlstate, sqlerrm, want, q; end if;
end $$;
create function public.t_count(q text) returns bigint language plpgsql as $$
declare n bigint; begin execute 'select count(*) from (' || q || ') s' into n; return n; end $$;
create function public.t_update(q text) returns bigint language plpgsql as $$
declare n bigint; begin execute q; get diagnostics n = row_count; return n; end $$;
create function public.t_as(uid text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid, false); end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test', '{"display_name":"  Alice  ","role":"admin","verification_status":"verified"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test',   '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.test', '{}');

-- 1. signup trigger ------------------------------------------------------------
do $$ begin
  assert (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Alice', 'display name trimmed';
  assert (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'bob', 'fallback to email local part';
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'member', 'metadata role ignored';
  assert (select verification_status from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'unverified', 'metadata verification ignored';
  assert (select email from public.private_profiles where id = '00000000-0000-0000-0000-00000000000a') = 'alice@example.test', 'email copied';
end $$;
update auth.users set email = 'alice2@example.test' where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select email from public.private_profiles where id = '00000000-0000-0000-0000-00000000000a') = 'alice2@example.test', 'email sync';
end $$;
-- Row for B has an avatar so storage read tests have something to find.
update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000000b/pic.png'
  where id = '00000000-0000-0000-0000-00000000000b';
insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000b/pic.png');

-- 2. anonymous users get nothing -----------------------------------------------
set role anon;
select public.t_fail('select * from public.profiles', '42501');
select public.t_fail('select * from public.private_profiles', '42501');
select public.t_fail('select * from public.public_profiles', '42501');
select public.t_fail($q$insert into public.profiles (id, display_name) values (gen_random_uuid(), 'x')$q$, '42501');
reset role;

-- 3. member A: own rows only, safe edits only --------------------------------------
set role authenticated;
select public.t_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert public.t_count('select 1 from public.profiles') = 1, 'A sees only own base row';
  assert public.t_count('select 1 from public.private_profiles') = 1, 'A sees only own private row';
  assert public.t_update($q$update public.profiles set bio = 'hello' where id = '00000000-0000-0000-0000-00000000000a'$q$) = 1, 'A edits own bio';
  assert public.t_update($q$update public.profiles set bio = 'pwned' where id = '00000000-0000-0000-0000-00000000000b'$q$) = 0, 'A cannot edit B (RLS)';
  assert public.t_update($q$update public.private_profiles set phone = '+91 98765 43210' where id = '00000000-0000-0000-0000-00000000000a'$q$) = 1, 'A edits own phone';
  assert public.t_update($q$update public.private_profiles set phone = '1' where id = '00000000-0000-0000-0000-00000000000b'$q$) = 0, 'A cannot edit B phone';
end $$;
-- privileged fields and structure: blocked by column grants
select public.t_fail($q$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a'$q$, '42501');
select public.t_fail($q$update public.profiles set verification_status = 'verified' where id = '00000000-0000-0000-0000-00000000000a'$q$, '42501');
select public.t_fail($q$update public.profiles set id = gen_random_uuid() where id = '00000000-0000-0000-0000-00000000000a'$q$, '42501');
select public.t_fail($q$update public.private_profiles set email = 'evil@example.test' where id = '00000000-0000-0000-0000-00000000000a'$q$, '42501');
select public.t_fail($q$insert into public.profiles (id, display_name) values (gen_random_uuid(), 'x')$q$, '42501');
select public.t_fail($q$insert into public.private_profiles (id, email) values (gen_random_uuid(), 'x')$q$, '42501');
select public.t_fail($q$delete from public.profiles where id = '00000000-0000-0000-0000-00000000000a'$q$, '42501');
-- validation constraints
select public.t_fail($q$update public.private_profiles set phone = 'abc' where id = '00000000-0000-0000-0000-00000000000a'$q$, '23514');
select public.t_fail($q$update public.profiles set bio = repeat('x', 501) where id = '00000000-0000-0000-0000-00000000000a'$q$, '23514');
select public.t_fail($q$update public.profiles set display_name = '' where id = '00000000-0000-0000-0000-00000000000a'$q$, '23514');
-- avatar_path ownership constraint
select public.t_fail($q$update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000000b/x.png' where id = '00000000-0000-0000-0000-00000000000a'$q$, '23514');
select public.t_fail($q$update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000000a/../x.png' where id = '00000000-0000-0000-0000-00000000000a'$q$, '23514');
select public.t_fail($q$update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000000a/x.svg' where id = '00000000-0000-0000-0000-00000000000a'$q$, '23514');
do $$ begin
  assert public.t_update($q$update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000000a/ok_1.webp' where id = '00000000-0000-0000-0000-00000000000a'$q$) = 1, 'own avatar path ok';
end $$;

-- 4. public view: no private data, honours is_public ---------------------------------
do $$ begin
  assert public.t_count('select 1 from public.public_profiles') = 3, 'A sees all three public profiles';
end $$;
select public.t_fail('select email from public.public_profiles', '42703');
select public.t_fail('select phone from public.public_profiles', '42703');
select public.t_fail('select role from public.public_profiles', '42703');
select public.t_fail('select is_public from public.public_profiles', '42703');
reset role;
update public.profiles set is_public = false where id = '00000000-0000-0000-0000-00000000000b';
set role authenticated;
select public.t_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert public.t_count($q$select 1 from public.public_profiles where id = '00000000-0000-0000-0000-00000000000b'$q$) = 0, 'private profile hidden from view';
end $$;
reset role;

-- 5. storage ----------------------------------------------------------------------
do $$ begin
  assert (select public from storage.buckets where id = 'avatars') = false, 'bucket private';
  assert (select file_size_limit from storage.buckets where id = 'avatars') = 2097152, 'size limit';
end $$;
set role authenticated;
select public.t_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert public.t_update($q$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000a/ok_1.webp')$q$) = 1, 'upload own folder';
  assert public.t_count($q$select 1 from storage.objects where name like '00000000-0000-0000-0000-00000000000b/%'$q$) = 0, 'B avatar hidden while B profile is private';
end $$;
select public.t_fail($q$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000b/evil.png')$q$, '42501');
select public.t_fail($q$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000a/sub/x.png')$q$, '42501');
select public.t_fail($q$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000a/x.html')$q$, '42501');
select public.t_fail($q$insert into storage.objects (bucket_id, name) values ('avatars', 'loose.png')$q$, '42501');
reset role;
update public.profiles set is_public = true where id = '00000000-0000-0000-0000-00000000000b';
set role authenticated;
select public.t_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert public.t_count($q$select 1 from storage.objects where name like '00000000-0000-0000-0000-00000000000b/%'$q$) = 1, 'B avatar readable when B public';
  assert public.t_update($q$delete from storage.objects where name like '00000000-0000-0000-0000-00000000000b/%'$q$) = 0, 'A cannot delete B file';
  assert public.t_update($q$update storage.objects set name = '00000000-0000-0000-0000-00000000000a/ok_2.png' where name like '00000000-0000-0000-0000-00000000000b/%'$q$) = 0, 'A cannot move B file';
  assert public.t_update($q$delete from storage.objects where name = '00000000-0000-0000-0000-00000000000a/ok_1.webp'$q$) = 1, 'A deletes own file';
end $$;
reset role;
set role anon; -- anon has no grant on storage.objects at all
select public.t_fail('select * from storage.objects', '42501');
reset role;

-- 6. trigger is a second line of defence even if a grant is widened by mistake --------
select public.t_as('');  -- no JWT subject: service-role / SQL-editor path
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000c';
grant update (role, verification_status) on public.profiles to authenticated;                -- simulate a bad future grant
set role authenticated;
select public.t_as('00000000-0000-0000-0000-00000000000a');
select public.t_fail($q$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a'$q$, '42501');
select public.t_fail($q$update public.profiles set verification_status = 'verified' where id = '00000000-0000-0000-0000-00000000000a'$q$, '42501');
select public.t_as('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert public.t_update($q$update public.profiles set verification_status = 'verified' where id = '00000000-0000-0000-0000-00000000000b'$q$) = 1, 'admin may moderate';
end $$;
reset role;
revoke update (role, verification_status) on public.profiles from authenticated;

-- 7. discovery (migration 0003) -----------------------------------------------------------
-- State on entry: A=alumni-to-be, B=student (verified by admin C in section 6), C=admin.
reset role;
select public.t_as('');
update public.profiles set kind = 'student', programme = 'B.Tech CSE', admission_year = 2025, skills = array['Python', 'SQL'],
  open_to_mentoring = false where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set kind = 'student', programme = 'MBA', admission_year = 2025, skills = array['Marketing']
  where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set kind = 'alumni', graduation_year = 2024, company = 'Acme_Co%', job_title = 'Engineer', open_to_mentoring = true
  where id = '00000000-0000-0000-0000-00000000000a';
-- D signs up and has not filled in anything: auto-generated name only.
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000d', 'dave@example.test', '{}');

-- anonymous users cannot call the function at all
set role anon;
select public.t_fail($q$select * from public.search_public_profiles('student')$q$, '42501');
reset role;

set role authenticated;
select public.t_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  -- listing and kind separation
  assert public.t_count($q$select 1 from public.search_public_profiles('student')$q$) = 2, 'two students listed (B, C)';
  assert public.t_count($q$select 1 from public.search_public_profiles('alumni')$q$) = 1, 'one alumnus listed (A)';
  assert public.t_count($q$select 1 from public.search_public_profiles('admin')$q$) = 0, 'unknown kind returns nothing';
  assert public.t_count($q$select 1 from public.search_public_profiles('student') where display_name = 'dave'$q$) = 0, 'blank profile (D) not listed';
  -- search by name, programme, skill
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_query => 'BOB')$q$) = 1, 'name search is case-insensitive';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_programme => 'mba')$q$) = 1, 'programme filter';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_skill => 'pyth')$q$) = 1, 'skill filter (partial, case-insensitive)';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_skill => 'nothing-like-this')$q$) = 0, 'no match is empty';
  -- LIKE wildcards in user input are literal
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_query => '%')$q$) = 0, 'percent is literal';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_query => '_')$q$) = 0, 'underscore is literal';
  assert public.t_count($q$select 1 from public.search_public_profiles('alumni', p_company => '_cme')$q$) = 0, 'underscore does not act as a wildcard';
  assert public.t_count($q$select 1 from public.search_public_profiles('alumni', p_company => 'acme_co%')$q$) = 1, 'escaped literal matches';
  -- year of study respects programme length (MBA = 2 years, B.Tech = 4)
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_admission_year => 2025, p_year_of_study => 2)$q$) = 2, 'year 2 includes the MBA student';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_admission_year => 2025, p_year_of_study => 3)$q$) = 1, 'year 3 excludes the MBA student';
  assert public.t_count($q$select 1 from public.search_public_profiles('alumni', p_graduation_year => 2024)$q$) = 1, 'graduation year filter';
  assert public.t_count($q$select 1 from public.search_public_profiles('alumni', p_graduation_year => 2023)$q$) = 0, 'graduation year miss';
  assert public.t_count($q$select 1 from public.search_public_profiles('alumni', p_mentoring => true)$q$) = 1, 'mentoring filter';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_mentoring => true)$q$) = 0, 'no mentoring students';
  -- sorting and pagination
  assert (select display_name from public.search_public_profiles('student', p_sort => 'name', p_limit => 1)) = 'bob', 'name ascending';
  assert (select display_name from public.search_public_profiles('student', p_sort => 'name_desc', p_limit => 1)) = 'carol', 'name descending';
  assert (select display_name from public.search_public_profiles('student', p_sort => 'not-a-sort; drop table x', p_limit => 1)) = 'bob', 'bad sort falls back to name';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_limit => 1)$q$) = 1, 'limit applies';
  assert (select max(total_count) from public.search_public_profiles('student', p_limit => 1)) = 2, 'total_count ignores the page size';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_limit => 1, p_offset => 1)$q$) = 1, 'second page';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_limit => 1, p_offset => 100)$q$) = 0, 'beyond the end is empty';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_limit => 100000)$q$) <= 50, 'limit is clamped';
  assert public.t_count($q$select 1 from public.search_public_profiles('student', p_offset => -5)$q$) = 2, 'negative offset is clamped to 0';
  assert (select is_verified from public.search_public_profiles('student', p_query => 'bob')) = true, 'verified flag from admin-set status';
end $$;
-- only the approved columns exist on the result
select public.t_fail($q$select email from public.search_public_profiles('student')$q$, '42703');
select public.t_fail($q$select phone from public.search_public_profiles('student')$q$, '42703');
select public.t_fail($q$select role from public.search_public_profiles('student')$q$, '42703');
select public.t_fail($q$select is_public from public.search_public_profiles('student')$q$, '42703');
select public.t_fail($q$select verification_status from public.search_public_profiles('student')$q$, '42703');
select public.t_fail($q$select bio from public.search_public_profiles('student')$q$, '42703');
select public.t_fail($q$select avatar_path from public.search_public_profiles('student')$q$, '42703');
-- base tables are still closed to other members
do $$ begin
  assert public.t_count('select 1 from public.private_profiles') = 1, 'A still sees only own private row';
end $$;
reset role;

-- unapproved members disappear: private, then rejected
select public.t_as('');  -- superuser path: no JWT subject, or the privileged-field trigger sees member A
update public.profiles set is_public = false where id = '00000000-0000-0000-0000-00000000000b';
set role authenticated;
select public.t_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert public.t_count($q$select 1 from public.search_public_profiles('student')$q$) = 1, 'private member (B) not listed';
  assert public.t_count($q$select 1 from public.public_profiles where id = '00000000-0000-0000-0000-00000000000b'$q$) = 0, 'private member not in view';
end $$;
reset role;
select public.t_as('');
update public.profiles set is_public = true where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set verification_status = 'rejected' where id = '00000000-0000-0000-0000-00000000000c';
set role authenticated;
select public.t_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert public.t_count($q$select 1 from public.search_public_profiles('student')$q$) = 1, 'rejected member (C) not listed';
  assert public.t_count($q$select 1 from public.public_profiles where id = '00000000-0000-0000-0000-00000000000c'$q$) = 0, 'rejected member not in view';
end $$;
reset role;

select 'ALL RLS TESTS PASSED' as result;
