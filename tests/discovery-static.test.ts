// STATIC tests: they read the migration and source files as text. They catch accidental regressions
// (a wider column list, a table query, a SECURITY DEFINER) but do NOT execute any SQL.
// Real behaviour is covered by supabase/tests/rls.test.sql (needs PostgreSQL; see npm run test:db).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const sql = read('supabase/migrations/0003_discovery.sql');
const noComments = sql.replace(/--.*$/gm, '');

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const fnStart = noComments.indexOf('create or replace function public.search_public_profiles');
// The function body only: stop before the REVOKE / GRANT statements that follow it.
const searchFn = noComments.slice(fnStart, noComments.indexOf('revoke all', fnStart));

test('search function is SECURITY INVOKER with a pinned search_path (never DEFINER)', () => {
  assert.match(searchFn, /security invoker/i);
  assert.match(searchFn, /set search_path = ''/);
  assert.ok(!/security definer/i.test(noComments), 'migration 0003 must not contain SECURITY DEFINER');
});

test('search function reads only the public view, never a base table', () => {
  assert.match(searchFn, /from public\.public_profiles/);
  assert.ok(!/public\.profiles/.test(searchFn), 'must not touch public.profiles');
  assert.ok(!/private_profiles/.test(noComments), 'must not mention private_profiles');
});

test('returned columns exclude every private or internal field', () => {
  const returns = /returns table \(([\s\S]*?)\)\s*language/i.exec(searchFn)?.[1] ?? '';
  const cols = [...returns.matchAll(/^\s*(\w+)\s/gm)].map((m) => m[1]);
  assert.deepEqual(cols, ['id', 'display_name', 'kind', 'programme', 'admission_year', 'graduation_year', 'company', 'job_title', 'skills', 'open_to_mentoring', 'is_verified', 'total_count']);
  for (const forbidden of ['email', 'phone', 'role', 'is_public', 'verification_status', 'bio', 'avatar_path']) assert.ok(!cols.includes(forbidden), forbidden);
});

test('execute is revoked from public and anon, granted to authenticated only', () => {
  for (const fn of ['like_escape\\(text\\)', 'programme_duration_years\\(text\\)', 'search_public_profiles\\(']) {
    assert.match(noComments, new RegExp(`revoke all on function public\\.${fn}[\\s\\S]*?from public, anon;`), `revoke ${fn}`);
    assert.match(noComments, new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*?to authenticated;`), `grant ${fn}`);
  }
  assert.ok(!/to\s+(anon|public)\b/i.test(noComments.replace(/revoke[\s\S]*?;/gi, '')), 'no grant to anon/public');
});

test('user input is bounded and escaped; no dynamic SQL', () => {
  assert.match(searchFn, /least\(greatest\(coalesce\(p_limit, 12\), 1\), 50\)/);
  assert.match(searchFn, /least\(greatest\(coalesce\(p_offset, 0\), 0\), 10000\)/);
  assert.match(searchFn, /left\(btrim\(p_query\), 100\)/);
  // name, programme, company and skill are each escaped before being used in ILIKE
  assert.equal((searchFn.match(/public\.like_escape\(f\./g) ?? []).length, 4);
  assert.ok(!/\bexecute\b/i.test(searchFn), 'no EXECUTE / dynamic SQL');
});

test('rejected members are hidden by the view; privacy gates are not weakened', () => {
  assert.match(noComments, /where p\.is_public\s+and p\.verification_status <> 'rejected'/);
  assert.ok(!/disable row level security|using\s*\(\s*true\s*\)|grant\s+(select|all)[^;]*\bto\s+anon/i.test(noComments));
  assert.ok(!/alter table/i.test(noComments), '0003 changes no table or policy');
});

test('discovery code never queries tables or storage, and never uses a service key', () => {
  const files = [
    ...walk(join(root, 'src/lib/discovery')),
    ...walk(join(root, 'src/components/people')),
    join(root, 'src/app/discover/page.tsx'),
    join(root, 'src/app/alumni/page.tsx'),
    join(root, 'src/app/people/[id]/page.tsx'),
  ];
  assert.ok(files.length >= 8);
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    assert.ok(!/\.from\(\s*['"`](profiles|private_profiles)/.test(text), `${f}: queries a base table`);
    assert.ok(!/private_profiles|service_role|SERVICE_ROLE/.test(text), `${f}: references private data or a service key`);
  }
  // The profile route reads through the view-backed helper only.
  assert.match(read('src/lib/profile/queries.ts'), /from\('public_profiles'\)/);
});

test('result pages gate on a verified user, not on an unverified cookie', () => {
  const page = read('src/components/people/DirectoryPage.tsx');
  assert.match(page, /getVerifiedUser\(\)/);
  assert.ok(!/getSession\(/.test(page));
  assert.match(read('src/app/people/[id]/page.tsx'), /getVerifiedUser\(\)/);
});
