-- ONBOARD Milestone 4: secure student/alumni direct messaging.
-- ADDITIVE ONLY. Review and apply manually to a development Supabase project first.
-- This migration is never executed by the application and must not be run against production
-- until the schema, policies, and tests have been reviewed.

-- Conversations do not FK to auth.users / profiles on purpose: deleting an account must not
-- destroy the other participant's historical conversation. Identity is rendered through the
-- safe public_profiles view, with a neutral "Member" fallback when a profile disappears.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null,
  user_high uuid not null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_pair_order check (user_low < user_high),
  constraint conversations_pair_unique unique (user_low, user_high)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (
    char_length(body) between 1 and 2000
    and body = btrim(body)
    and body ~ '[^[:space:]]'
    and body !~ '^[[:space:]]|[[:space:]]$'
  ),
  client_id uuid not null,
  created_at timestamptz not null default now(),
  constraint messages_client_retry_unique unique (conversation_id, sender_id, client_id)
);

create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null,
  reason text not null check (reason in ('harassment', 'spam', 'threats', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  constraint message_reports_once unique (message_id, reporter_id)
);

create table public.user_blocks (
  blocked_by uuid not null,
  blocked_user uuid not null,
  created_at timestamptz not null default now(),
  constraint user_blocks_not_self check (blocked_by <> blocked_user),
  constraint user_blocks_pair_unique unique (blocked_by, blocked_user)
);

create index conversations_low_recent_idx on public.conversations (user_low, last_message_at desc nulls last, id desc);
create index conversations_high_recent_idx on public.conversations (user_high, last_message_at desc nulls last, id desc);
create index messages_history_idx on public.messages (conversation_id, created_at desc, id desc);
create index messages_sender_recent_idx on public.messages (sender_id, created_at desc);
create index user_blocks_blocked_by_idx on public.user_blocks (blocked_by, created_at desc);
create index user_blocks_blocked_user_idx on public.user_blocks (blocked_user, blocked_by);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.user_blocks enable row level security;
alter table public.message_reports enable row level security;

-- Current year-of-study function deliberately returns NULL for unknown, not-started, or
-- completed students. That makes the student-to-student policy fail closed. Uses the same
-- July 1 boundary, Asia/Kolkata clock, and MBA=2/otherwise=4 rule as TypeScript.
create or replace function public.messaging_year_of_study(
  p_admission_year smallint,
  p_programme text,
  p_at timestamptz default now()
) returns smallint
language plpgsql immutable set search_path = '' as $$
declare
  v_local timestamp without time zone;
  v_academic_start integer;
  v_year integer;
  v_duration integer;
begin
  if p_admission_year is null or p_admission_year < 1990 or p_admission_year > 2100
     or p_programme is null or btrim(p_programme) = '' or p_at is null then
    return null;
  end if;
  v_local := p_at at time zone 'Asia/Kolkata';
  v_academic_start := extract(year from v_local)::integer;
  if extract(month from v_local)::integer < 7 then
    v_academic_start := v_academic_start - 1;
  end if;
  v_year := v_academic_start - p_admission_year + 1;
  v_duration := public.programme_duration_years(p_programme)::integer;
  if v_year < 1 or v_year > v_duration then
    return null;
  end if;
  return v_year::smallint;
end $$;
revoke all on function public.messaging_year_of_study(smallint, text, timestamptz) from public, anon;
grant execute on function public.messaging_year_of_study(smallint, text, timestamptz) to authenticated;

-- Internal eligibility implementation. SECURITY DEFINER is required because ordinary members
-- can only select their own profiles. The function returns only a boolean, never profile data.
create or replace function public.messaging_is_allowed_internal(p_actor uuid, p_target uuid)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_actor_kind text;
  v_target_kind text;
  v_actor_year smallint;
  v_target_year smallint;
  v_actor_programme text;
  v_target_programme text;
  v_actor_admission smallint;
  v_target_admission smallint;
  v_actor_mentor boolean;
  v_target_mentor boolean;
begin
  if p_actor is null or p_target is null or p_actor = p_target then return false; end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocked_by = p_actor and b.blocked_user = p_target)
       or (b.blocked_by = p_target and b.blocked_user = p_actor)
  ) then return false; end if;

  select p.kind, p.programme, p.admission_year, p.open_to_mentoring
    into v_actor_kind, v_actor_programme, v_actor_admission, v_actor_mentor
  from public.profiles p
  where p.id = p_actor and p.is_public and p.verification_status <> 'rejected';
  if not found then return false; end if;

  select p.kind, p.programme, p.admission_year, p.open_to_mentoring
    into v_target_kind, v_target_programme, v_target_admission, v_target_mentor
  from public.profiles p
  where p.id = p_target and p.is_public and p.verification_status <> 'rejected';
  if not found then return false; end if;

  if v_actor_kind = 'alumni' and v_target_kind = 'alumni' then return true; end if;

  if v_actor_kind = 'student' and v_target_kind = 'student' then
    v_actor_year := public.messaging_year_of_study(v_actor_admission, v_actor_programme, now());
    v_target_year := public.messaging_year_of_study(v_target_admission, v_target_programme, now());
    return v_actor_year is not null and v_target_year is not null and v_actor_year <> v_target_year;
  end if;

  -- Mentoring policy is independent of student-to-student year comparisons. Alumni have no
  -- year of study; never compare an alumnus year to a student year.
  if v_actor_kind = 'student' and v_target_kind = 'alumni' then
    return v_target_mentor;
  end if;

  if v_actor_kind = 'alumni' and v_target_kind = 'student' then
    return v_actor_mentor;
  end if;

  return false;
end $$;
revoke all on function public.messaging_is_allowed_internal(uuid, uuid) from public, anon, authenticated;

-- Serialize starts, blocks, unblocks and message inserts for the same user pair, so a concurrent
-- block and send cannot both pass the eligibility check without observing the earlier lock holder.
create or replace function public.messaging_lock_pair(p_a uuid, p_b uuid)
returns void language sql volatile security definer set search_path = '' as $$
  select pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(p_a, p_b)::text || ':' || greatest(p_a, p_b)::text, 0)
  );
$$;
revoke all on function public.messaging_lock_pair(uuid, uuid) from public, anon, authenticated;

create or replace function public.can_message_member(p_target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
     and public.messaging_is_allowed_internal((select auth.uid()), p_target);
$$;
revoke all on function public.can_message_member(uuid) from public, anon;
grant execute on function public.can_message_member(uuid) to authenticated;

-- Used by INSERT policy and repeated by the message trigger; returns only a boolean.
create or replace function public.messaging_send_allowed(p_conversation_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid;
begin
  if v_actor is null then return false; end if;
  select case when c.user_low = v_actor then c.user_high else c.user_low end
    into v_target
  from public.conversations c
  where c.id = p_conversation_id and (c.user_low = v_actor or c.user_high = v_actor);
  if not found then return false; end if;
  return public.messaging_is_allowed_internal(v_actor, v_target);
end $$;
revoke all on function public.messaging_send_allowed(uuid) from public, anon;
grant execute on function public.messaging_send_allowed(uuid) to authenticated;

-- Existing conversations may still be opened for history after an eligibility change. This
-- function reuses an existing pair; it creates a new pair only when current policy permits it.
create or replace function public.start_conversation(p_target uuid)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_low uuid;
  v_high uuid;
  v_id uuid;
begin
  if v_actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_target is null or p_target = v_actor then raise exception 'invalid recipient' using errcode = '22023'; end if;
  v_low := least(v_actor, p_target);
  v_high := greatest(v_actor, p_target);
  perform public.messaging_lock_pair(v_low, v_high);

  select c.id into v_id from public.conversations c where c.user_low = v_low and c.user_high = v_high;
  if found then return v_id; end if;

  if not public.messaging_is_allowed_internal(v_actor, p_target) then
    raise exception 'messaging is unavailable for this member' using errcode = '42501';
  end if;

  insert into public.conversations (user_low, user_high) values (v_low, v_high)
    on conflict (user_low, user_high) do nothing returning id into v_id;
  if v_id is null then
    select c.id into v_id from public.conversations c where c.user_low = v_low and c.user_high = v_high;
  end if;
  return v_id;
end $$;
revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

create or replace function public.block_member(p_target uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_target is null or p_target = v_actor then raise exception 'invalid member' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_target) then
    raise exception 'invalid member' using errcode = '22023';
  end if;
  perform public.messaging_lock_pair(v_actor, p_target);
  insert into public.user_blocks (blocked_by, blocked_user) values (v_actor, p_target)
    on conflict (blocked_by, blocked_user) do nothing;
end $$;
revoke all on function public.block_member(uuid) from public, anon;
grant execute on function public.block_member(uuid) to authenticated;

create or replace function public.unblock_member(p_target uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_target is null or p_target = v_actor then raise exception 'invalid member' using errcode = '22023'; end if;
  perform public.messaging_lock_pair(v_actor, p_target);
  delete from public.user_blocks where blocked_by = v_actor and blocked_user = p_target;
end $$;
revoke all on function public.unblock_member(uuid) from public, anon;
grant execute on function public.unblock_member(uuid) to authenticated;

create or replace function public.my_blocked_member_ids()
returns table (user_id uuid) language sql stable security definer set search_path = '' as $$
  select b.blocked_user from public.user_blocks b where b.blocked_by = (select auth.uid())
  order by b.created_at desc;
$$;
revoke all on function public.my_blocked_member_ids() from public, anon;
grant execute on function public.my_blocked_member_ids() to authenticated;

-- Keyset page cursor is (created_at, id); return a safe name fallback when the other profile is
-- now private, rejected, or deleted. Bodies are visible only through conversation RLS.
create or replace function public.my_conversations(p_limit integer default 30)
returns table (
  conversation_id uuid,
  other_user_id uuid,
  other_display_name text,
  other_kind text,
  last_message_at timestamptz,
  last_message_preview text
) language sql stable security invoker set search_path = '' as $$
  select c.id,
    case when c.user_low = (select auth.uid()) then c.user_high else c.user_low end,
    coalesce(pp.display_name, 'Member'),
    pp.kind,
    c.last_message_at,
    left(lm.body, 160)
  from public.conversations c
  left join public.public_profiles pp
    on pp.id = case when c.user_low = (select auth.uid()) then c.user_high else c.user_low end
  left join lateral (
    select m.body from public.messages m where m.conversation_id = c.id
    order by m.created_at desc, m.id desc limit 1
  ) lm on true
  where (c.user_low = (select auth.uid()) or c.user_high = (select auth.uid()))
  order by c.last_message_at desc nulls last, c.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
$$;
revoke all on function public.my_conversations(integer) from public, anon;
grant execute on function public.my_conversations(integer) to authenticated;

-- Last-activity maintenance is not a direct client write. SECURITY DEFINER lets this trigger
-- update the conversation row even though authenticated clients cannot update conversations.
create or replace function public.messaging_touch_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;
revoke all on function public.messaging_touch_conversation() from public, anon, authenticated;
create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.messaging_touch_conversation();

-- Each send rechecks identity, membership, blocks, profile visibility, and eligibility while holding
-- the same pair lock used by block/start functions. There is no UPDATE/DELETE path for messages.
create or replace function public.messaging_validate_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid;
begin
  if v_actor is null or new.sender_id is distinct from v_actor then
    raise exception 'invalid sender' using errcode = '42501';
  end if;
  select case when c.user_low = v_actor then c.user_high else c.user_low end
    into v_target from public.conversations c
    where c.id = new.conversation_id and (c.user_low = v_actor or c.user_high = v_actor);
  if not found then raise exception 'not a conversation member' using errcode = '42501'; end if;
  perform public.messaging_lock_pair(v_actor, v_target);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text, 1));
  if (select count(*) from public.messages m where m.sender_id = v_actor and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'message rate limit exceeded; wait before sending again' using errcode = 'P0001';
  end if;
  if not public.messaging_is_allowed_internal(v_actor, v_target) then
    raise exception 'messaging is unavailable for this member' using errcode = '42501';
  end if;
  new.body := btrim(new.body);
  if char_length(new.body) < 1 or char_length(new.body) > 2000 then
    raise exception 'message must be 1 to 2000 characters' using errcode = '22023';
  end if;
  return new;
end $$;
revoke all on function public.messaging_validate_message() from public, anon, authenticated;
create trigger messages_validate before insert on public.messages
  for each row execute function public.messaging_validate_message();

-- RLS: no public conversation creation, participant manipulation, message edits/deletes, or block
-- writes through table endpoints. Conversation creation and block changes use the RPCs above.
create policy conversations_select_member on public.conversations
  for select to authenticated
  using ((select auth.uid()) = user_low or (select auth.uid()) = user_high);

create policy messages_select_member on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and ((select auth.uid()) = c.user_low or (select auth.uid()) = c.user_high)
  ));

create policy messages_insert_authorized on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.messaging_send_allowed(conversation_id)
  );

create policy user_blocks_select_own on public.user_blocks
  for select to authenticated using (blocked_by = (select auth.uid()));

revoke all on public.conversations, public.messages, public.user_blocks from public, anon, authenticated;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body, client_id) on public.messages to authenticated;
grant select on public.user_blocks to authenticated;
-- Reports are write-only through the validated report_message() RPC; clients can never read reports.
revoke all on public.message_reports from public, anon, authenticated;

-- Supabase normally creates this publication. Local test PostgreSQL may not, so create only when
-- missing; in production this only adds the messages table if it is not already published.
do $$
declare
  v_publication_exists boolean;
  v_table_exists boolean;
begin
  select exists(select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
    into v_publication_exists;
  if not v_publication_exists then
    create publication supabase_realtime;
  end if;
  select exists(
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) into v_table_exists;
  if not v_table_exists then alter publication supabase_realtime add table public.messages; end if;
end $$;

-- Member reporting is private and write-only to regular clients. It records a report only when
-- the caller is a participant in the conversation and the reported message was sent by someone else.
create or replace function public.report_message(p_message_id uuid, p_reason text, p_details text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_sender uuid;
  v_details text := nullif(left(btrim(coalesce(p_details, '')), 1000), '');
begin
  if v_actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_reason is null or p_reason not in ('harassment', 'spam', 'threats', 'other') then
    raise exception 'invalid report reason' using errcode = '22023';
  end if;
  select m.sender_id into v_sender
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where m.id = p_message_id
    and (c.user_low = v_actor or c.user_high = v_actor);
  if not found then raise exception 'message not found' using errcode = '42501'; end if;
  if v_sender = v_actor then raise exception 'cannot report your own message' using errcode = '22023'; end if;
  insert into public.message_reports (message_id, reporter_id, reason, details)
  values (p_message_id, v_actor, p_reason, v_details)
  on conflict (message_id, reporter_id) do nothing;
end $$;
revoke all on function public.report_message(uuid, text, text) from public, anon;
grant execute on function public.report_message(uuid, text, text) to authenticated;

