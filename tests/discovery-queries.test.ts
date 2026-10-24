// MOCKED tests: a fake client stands in for Supabase. These prove what the app SENDS and how it
// treats whatever comes BACK. They do not prove database behaviour; see supabase/tests/rls.test.sql.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_SIZE, parseDirectoryParams } from '../src/lib/discovery/params.ts';
import { searchDirectory, toDirectoryEntry } from '../src/lib/discovery/queries.ts';

const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';

function row(over: Record<string, unknown> = {}) {
  return {
    id: ID_A, display_name: 'Ada', kind: 'student', programme: 'B.Tech CSE', admission_year: 2025, graduation_year: null,
    company: null, job_title: null, skills: ['Python'], open_to_mentoring: false, is_verified: true, total_count: 1, ...over,
  };
}

/** Records every call. Has `rpc` only: any attempt to use `.from()` would throw. */
function fakeClient(response: { data: unknown; error: { code?: string; message?: string } | null } | Error) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  return {
    calls,
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
    },
  };
}

test('search calls exactly one database function, with validated arguments, and nothing else', async () => {
  const c = fakeClient({ data: [row()], error: null });
  const req = parseDirectoryParams('student', { q: 'ada', skill: 'py', page: '2' });
  const out = await searchDirectory(c, req, new Date('2026-10-23T09:00:00Z'));
  assert.equal(c.calls.length, 1);
  assert.equal(c.calls[0]?.fn, 'search_public_profiles');
  assert.equal(c.calls[0]?.args.p_query, 'ada');
  assert.equal(c.calls[0]?.args.p_offset, PAGE_SIZE);
  assert.ok(out.ok);
});

test('privacy: only approved fields survive, even if the database row carries more', () => {
  const entry = toDirectoryEntry(
    row({ email: 'a@example.test', phone: '+91 99999 99999', role: 'admin', is_public: true, verification_status: 'verified', bio: 'secret bio', avatar_path: 'x/y.png', private_note: 'x' }),
  );
  assert.ok(entry);
  assert.deepEqual(Object.keys(entry).sort(), [
    'admissionYear', 'company', 'displayName', 'graduationYear', 'id', 'isVerified', 'jobTitle', 'kind', 'openToMentoring', 'programme', 'skills',
  ]);
  const json = JSON.stringify(entry);
  for (const leaked of ['a@example.test', '99999', 'admin', 'secret bio', 'x/y.png']) assert.ok(!json.includes(leaked), leaked);
});

test('rows with an invalid id, missing name or unknown kind are discarded', () => {
  assert.equal(toDirectoryEntry(row({ id: 'not-a-uuid' })), null);
  assert.equal(toDirectoryEntry(row({ id: '../../etc/passwd' })), null);
  assert.equal(toDirectoryEntry(row({ display_name: '' })), null);
  assert.equal(toDirectoryEntry(row({ kind: 'admin' })), null);
  assert.equal(toDirectoryEntry(null), null);
  assert.equal(toDirectoryEntry('x'), null);
});

test('field types are coerced defensively', () => {
  const e = toDirectoryEntry(row({ admission_year: '2025', skills: ['Go', 7, null, { x: 1 }], open_to_mentoring: 'yes', is_verified: 1 }));
  assert.ok(e);
  assert.equal(e.admissionYear, null);
  assert.deepEqual(e.skills, ['Go']);
  assert.equal(e.openToMentoring, false);
  assert.equal(e.isVerified, false);
});

test('pagination: total comes from the database, page count is derived, last page reports its own rows', async () => {
  const rows = Array.from({ length: 5 }, (_, i) => row({ id: `00000000-0000-4000-8000-0000000000${(16 + i).toString(16).padStart(2, '0')}`, total_count: 29 }));
  const out = await searchDirectory(fakeClient({ data: rows, error: null }), parseDirectoryParams('student', { page: '3' }));
  assert.ok(out.ok);
  if (!out.ok) return;
  assert.equal(out.total, 29);
  assert.equal(out.pageCount, 3);
  assert.equal(out.entries.length, 5);
  assert.equal(out.outOfRange, false);
});

test('empty results: no rows on page 1 is an ordinary empty result', async () => {
  const out = await searchDirectory(fakeClient({ data: [], error: null }), parseDirectoryParams('student', { q: 'nobody' }));
  assert.ok(out.ok);
  if (!out.ok) return;
  assert.deepEqual([out.entries.length, out.total, out.pageCount, out.outOfRange], [0, 0, 1, false]);
});

test('empty results: no rows beyond page 1 is reported as out of range', async () => {
  const out = await searchDirectory(fakeClient({ data: [], error: null }), parseDirectoryParams('student', { page: '9' }));
  assert.ok(out.ok);
  if (out.ok) assert.equal(out.outOfRange, true);
});

test('errors: a database error becomes a generic failure and its message is never logged or returned', async () => {
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...a: unknown[]) => void logged.push(a);
  try {
    const out = await searchDirectory(fakeClient({ data: null, error: { code: '42501', message: 'permission denied for table private_profiles' } }), parseDirectoryParams('student', {}));
    assert.deepEqual(out, { ok: false });
    assert.ok(!JSON.stringify(logged).includes('private_profiles'));
    assert.ok(JSON.stringify(logged).includes('42501'));
  } finally {
    console.error = original;
  }
});

test('errors: a thrown network failure and a malformed response are both handled', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await searchDirectory(fakeClient(new Error('boom: secret details')), parseDirectoryParams('student', {})), { ok: false });
    assert.deepEqual(await searchDirectory(fakeClient({ data: { not: 'an array' }, error: null }), parseDirectoryParams('student', {})), { ok: false });
  } finally {
    console.error = original;
  }
});

test('authorization: the module cannot be given a table-capable client path (rpc-only interface)', async () => {
  // A client with no rpc at all fails closed instead of falling back to some other query.
  const out = await searchDirectory({} as never, parseDirectoryParams('student', {}));
  assert.deepEqual(out, { ok: false });
});
