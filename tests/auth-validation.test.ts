import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath } from '../src/lib/auth/redirect.ts';
import { isAllowedEmailDomain, parseAllowedDomains } from '../src/lib/auth/domain.ts';
import { normaliseEmail, parseSignIn, parseSignUp, passwordError } from '../src/lib/validation/auth.ts';
import { getSupabasePublicEnv, looksLikeSecretKey } from '../src/lib/env.ts';

const fd = (o: Record<string, string>) => ({ get: (k: string) => (k in o ? o[k] : null) });
const jwt = (payload: object) =>
  `aaaaaaaaaaaa.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.cccccccccccc`;

test('safeNextPath keeps same-site paths and rejects open redirects', () => {
  assert.equal(safeNextPath('/profile'), '/profile');
  assert.equal(safeNextPath('/marketplace?x=1'), '/marketplace?x=1');
  for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', '\\\\evil.com', 'javascript:alert(1)', '/a\nb', '', undefined, 42, '/' + 'a'.repeat(600)])
    assert.equal(safeNextPath(bad), '/profile', String(bad));
  assert.equal(safeNextPath('//evil.com', '/'), '/');
});

test('email domain allow-list', () => {
  const allowed = parseAllowedDomains(' KIET.edu, @example.org ,not a domain');
  assert.deepEqual(allowed, ['kiet.edu', 'example.org']);
  assert.equal(isAllowedEmailDomain('a@kiet.edu', allowed), true);
  assert.equal(isAllowedEmailDomain('a@KIET.EDU', allowed), true);
  assert.equal(isAllowedEmailDomain('a@evil-kiet.edu', allowed), false);
  assert.equal(isAllowedEmailDomain('a@kiet.edu.evil.com', allowed), false);
  assert.equal(isAllowedEmailDomain('a@x@kiet.edu', ['kiet.edu']), true); // last @ wins; Supabase rejects malformed
  assert.equal(isAllowedEmailDomain('anyone@anywhere.com', []), true);
  assert.equal(isAllowedEmailDomain('nodomain', allowed), false);
});

test('email and password validation', () => {
  assert.equal(normaliseEmail('  Rohan@KIET.edu '), 'rohan@kiet.edu');
  for (const bad of ['', 'x', 'a@b', 'a b@c.com', '<a>@c.com', 'a@c..com', null, 5]) assert.equal(normaliseEmail(bad), null, String(bad));
  assert.equal(passwordError('short'), 'Use at least 10 characters.');
  assert.equal(passwordError('x'.repeat(10)), null);
  assert.ok(passwordError('é'.repeat(40)));
  assert.ok(passwordError(undefined));
});

test('sign-in and sign-up parsing', () => {
  assert.equal(parseSignIn(fd({ email: 'bad', password: 'x' })).ok, false);
  const ok = parseSignUp(fd({ email: 'A@B.co', password: 'correct horse battery', displayName: '  Ada   Lovelace ' }));
  assert.ok(ok.ok && ok.data.displayName === 'Ada Lovelace' && ok.data.email === 'a@b.co');
  const bad = parseSignUp(fd({ email: 'nope', password: 'short', displayName: '' }));
  assert.ok(!bad.ok && 'email' in bad.errors && 'password' in bad.errors && 'displayName' in bad.errors);
});

test('Supabase env: validated, and secret keys refused in public variables', () => {
  const key = jwt({ role: 'anon' });
  assert.deepEqual(getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co/', NEXT_PUBLIC_SUPABASE_ANON_KEY: key }), {
    url: 'https://abc.supabase.co',
    anonKey: key,
  });
  assert.equal(getSupabasePublicEnv({}), null);
  assert.equal(getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: 'http://abc.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: key }), null);
  assert.notEqual(getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: key }), null);
  assert.equal(getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: 'not a url', NEXT_PUBLIC_SUPABASE_ANON_KEY: key }), null);
  const service = jwt({ role: 'service_role' });
  assert.equal(looksLikeSecretKey(service), true);
  assert.equal(looksLikeSecretKey('sb_secret_abcdefghijklmnopqrstuv'), true);
  assert.equal(looksLikeSecretKey(key), false);
  assert.equal(getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: service }), null);
});
