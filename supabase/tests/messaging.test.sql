-- Run only by scripts/test-db.sh on a throwaway local PostgreSQL database.
\set ON_ERROR_STOP on

-- The same CSV fixture is consumed by the TypeScript parity test.
create temporary table academic_year_fixture (
  admission_year smallint,
  programme text,
  instant_utc timestamptz,
  expected_status text,
  expected_year smallint
);
\copy academic_year_fixture from 'supabase/tests/fixtures/academic-year-parity.csv' with (format csv, header true)

do $$
declare f record; got smallint;
begin
  for f in select * from academic_year_fixture loop
    got := public.messaging_year_of_study(f.admission_year, f.programme, f.instant_utc);
    if f.expected_status = 'current' then
      assert got = f.expected_year, 'current-year SQL parity failure for ' || f.instant_utc::text;
    else
      assert got is null, 'non-current SQL standing must fail closed for ' || f.instant_utc::text;
    end if;
  end loop;
end $$;

-- Choose student years relative to the test clock so the policy tests remain useful in future years.
select (extract(year from timezone('Asia/Kolkata', now()))::integer -
        case when extract(month from timezone('Asia/Kolkata', now()))::integer < 7 then 1 else 0 end) as study_start_year \gset
select set_config('test.study_start_year', :'study_start_year', false);

-- Seed users through auth.users so the existing profile trigger and defaults are exercised.
insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'a@example.test', '{"display_name":"A Student"}'),
  ('10000000-0000-4000-8000-000000000002', 'b@example.test', '{"display_name":"B Student"}'),
  ('10000000-0000-4000-8000-000000000003', 'c@example.test', '{"display_name":"C Student"}'),
  ('10000000-0000-4000-8000-000000000004', 'd@example.test', '{"display_name":"D Alumni"}'),
  ('10000000-0000-4000-8000-000000000005', 'e@example.test', '{"display_name":"E Alumni"}');
update public.profiles set kind='student', programme='B.Tech CSE', admission_year=:'study_start_year' where id='10000000-0000-4000-8000-000000000001';
update public.profiles set kind='student', programme='B.Tech CSE', admission_year=(:'study_start_year'::integer - 1) where id='10000000-0000-4000-8000-000000000002';
update public.profiles set kind='student', programme='B.Tech CSE', admission_year=(:'study_start_year'::integer + 5) where id='10000000-0000-4000-8000-000000000003';
update public.profiles set kind='alumni', graduation_year=2024, open_to_mentoring=true where id='10000000-0000-4000-8000-000000000004';
update public.profiles set kind='alumni', graduation_year=2023, open_to_mentoring=false where id='10000000-0000-4000-8000-000000000005';

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $$ begin
  assert public.can_message_member('10000000-0000-4000-8000-000000000002'), 'different current student years should be allowed';
  assert not public.can_message_member('10000000-0000-4000-8000-000000000003'), 'unknown-standing student-to-student messaging should fail closed';
  assert public.can_message_member('10000000-0000-4000-8000-000000000004'), 'student may contact mentoring alumni';
  assert not public.can_message_member('10000000-0000-4000-8000-000000000005'), 'student may not contact alumni closed to mentoring';
  assert public.messaging_year_of_study(current_setting('test.study_start_year')::smallint, null, now()) is null, 'missing programme must fail closed';
  assert public.messaging_year_of_study(2025::smallint, 'B.Tech CSE', '2026-06-30 18:29:59+00') = 1, 'pre-cutover uses previous study year';
  assert public.messaging_year_of_study(2025::smallint, 'B.Tech CSE', '2026-06-30 18:30:00+00') = 2, 'cutover occurs at midnight IST';
end $$;
select public.start_conversation('10000000-0000-4000-8000-000000000002') as conversation_id \gset
select set_config('test.conversation_id', :'conversation_id', false);
select public.start_conversation('10000000-0000-4000-8000-000000000002') as conversation_id_again \gset
select set_config('test.conversation_id_again', :'conversation_id_again', false);
do $$ begin
  assert current_setting('test.conversation_id') = current_setting('test.conversation_id_again'), 'starting twice must reuse the conversation';
end $$;
insert into public.messages (conversation_id, sender_id, body, client_id)
values (current_setting('test.conversation_id')::uuid, '10000000-0000-4000-8000-000000000001', 'hello from A', '20000000-0000-4000-8000-000000000001');
do $$ declare denied boolean := false;
begin
  begin
    insert into public.messages (conversation_id, sender_id, body, client_id)
    values (current_setting('test.conversation_id')::uuid, '10000000-0000-4000-8000-000000000002', 'spoofed sender', gen_random_uuid());
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'sender identity cannot be forged';
  denied := false;
  begin
    insert into public.conversations (user_low, user_high)
    values ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'conversation creation is RPC-only';
  denied := false;
  begin
    update public.messages set body = 'edited' where conversation_id = current_setting('test.conversation_id')::uuid;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'messages are immutable to members';
  denied := false;
  begin
    delete from public.messages where conversation_id = current_setting('test.conversation_id')::uuid;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'members cannot delete messages';
end $$;
do $$ declare denied boolean := false;
begin
  begin
    insert into public.messages (id, conversation_id, sender_id, body, client_id, created_at)
    values (gen_random_uuid(), current_setting('test.conversation_id')::uuid, '10000000-0000-4000-8000-000000000001', 'forged timestamp', gen_random_uuid(), '2000-01-01 UTC');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'clients cannot set message IDs or timestamps';
end $$;
do $$ begin
  assert (select count(*) from public.messages where conversation_id = current_setting('test.conversation_id')::uuid) = 1, 'participant can read their message';
  assert (select last_message_at is not null from public.conversations where id = current_setting('test.conversation_id')::uuid), 'last_message_at trigger should run';
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select public.report_message((select id from public.messages where conversation_id = current_setting('test.conversation_id')::uuid limit 1), 'spam', 'test report');
do $$ declare denied boolean := false; begin
  begin perform count(*) from public.message_reports;
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'message reports must not be directly readable by members';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.profiles set admission_year=:'study_start_year' where id='10000000-0000-4000-8000-000000000002';

-- Eligibility is rechecked on every send, even in a conversation that used to be eligible.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
do $$ declare denied boolean := false;
begin
  assert not public.can_message_member('10000000-0000-4000-8000-000000000001'), 'changed to same year must disable sending';
  begin
    insert into public.messages (conversation_id, sender_id, body, client_id)
    values (current_setting('test.conversation_id')::uuid, '10000000-0000-4000-8000-000000000002', 'not allowed now', '20000000-0000-4000-8000-000000000002');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'same-year send must be denied at the database layer';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.profiles set admission_year=(:'study_start_year'::integer - 1) where id='10000000-0000-4000-8000-000000000002';

-- A block in either direction prevents sending; direct block table writes are denied.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select public.block_member('10000000-0000-4000-8000-000000000001');
do $$ declare denied boolean := false;
begin
  assert not public.can_message_member('10000000-0000-4000-8000-000000000001'), 'outgoing block prevents new messages';
  begin
    insert into public.user_blocks (blocked_by, blocked_user) values ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003');
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'direct block insert must be denied';
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $$ begin assert not public.can_message_member('10000000-0000-4000-8000-000000000002'), 'a block works in the reverse direction too'; end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select public.unblock_member('10000000-0000-4000-8000-000000000001');
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.profiles set is_public=false where id='10000000-0000-4000-8000-000000000002';

-- Existing participants retain history after a profile becomes private; strangers cannot read it.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
do $$ begin
  assert (select count(*) from public.conversations where id = current_setting('test.conversation_id')::uuid) = 1, 'participant keeps historical conversation access';
  assert (select count(*) from public.messages where conversation_id = current_setting('test.conversation_id')::uuid) = 1, 'participant keeps historical message access';
  assert not public.can_message_member('10000000-0000-4000-8000-000000000002'), 'private profile blocks new sends';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
do $$ begin
  assert (select count(*) from public.conversations where id = current_setting('test.conversation_id')::uuid) = 0, 'non-participant cannot see conversation';
  assert (select count(*) from public.messages where conversation_id = current_setting('test.conversation_id')::uuid) = 0, 'non-participant cannot read messages';
end $$;
reset role;

select 'MESSAGING SQL TESTS PASSED' as result;
