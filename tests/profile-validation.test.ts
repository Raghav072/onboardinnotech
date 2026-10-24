import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProfileForm, parseSkills, toProfileRow } from '../src/lib/validation/profile.ts';
import { AVATAR_MAX_BYTES, checkAvatar } from '../src/lib/validation/avatar.ts';

const fd = (o: Record<string, string>) => ({ get: (k: string) => (k in o ? o[k] : null) });
const base = { displayName: 'Ada', kind: 'student' };

test('profile form: valid input is normalised', () => {
  const r = parseProfileForm(
    fd({ ...base, displayName: '  Ada ‮ Lovelace ', programme: 'B.Tech CSE', admissionYear: '2025', bio: 'Hi\r\nthere\u0000', skills: 'Go, go , SQL,,', openToMentoring: 'on', phone: '+91 98765 43210' }),
  );
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.data.displayName, 'Ada Lovelace');
  assert.equal(r.data.bio, 'Hi\nthere');
  assert.deepEqual(r.data.skills, ['Go', 'SQL']);
  assert.equal(r.data.openToMentoring, true);
  assert.equal(r.data.isPublic, false); // unchecked checkbox means off
  assert.equal(r.data.admissionYear, 2025);
});

test('profile form: rejects bad input with field errors', () => {
  const r = parseProfileForm(fd({ displayName: '', kind: 'admin', admissionYear: '25', graduationYear: '1999', bio: 'x'.repeat(501), phone: 'call me', skills: 'x'.repeat(31) }));
  assert.ok(!r.ok);
  if (r.ok) return;
  for (const k of ['displayName', 'kind', 'admissionYear', 'graduationYear', 'bio', 'phone', 'skills']) assert.ok(k in r.errors, k);
  assert.equal(parseSkills(Array.from({ length: 21 }, (_, i) => `s${i}`).join(',')).error, 'Add at most 20 skills.');
});

test('profile row mapping never emits privileged or ownership columns', () => {
  const r = parseProfileForm(fd({ ...base, role: 'admin', verification_status: 'verified', id: 'x', avatar_path: 'x/y.png', isPublic: 'on' }));
  assert.ok(r.ok);
  if (!r.ok) return;
  const keys = Object.keys(toProfileRow(r.data)).sort();
  assert.deepEqual(keys, ['bio', 'company', 'admission_year', 'display_name', 'graduation_year', 'is_public', 'job_title', 'kind', 'open_to_mentoring', 'programme', 'skills'].sort());
  for (const forbidden of ['role', 'verification_status', 'id', 'avatar_path', 'email']) assert.ok(!keys.includes(forbidden), forbidden);
});

test('avatar: type comes from content, not from the declared MIME type', () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
  assert.deepEqual(checkAvatar(png, 'image/png'), { ok: true, ext: 'png', contentType: 'image/png' });
  assert.equal(checkAvatar(jpg).ok, true);
  assert.equal(checkAvatar(webp).ok, true);
  assert.equal(checkAvatar(png, 'image/jpeg').ok, false); // spoofed MIME
  assert.equal(checkAvatar(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'), 'image/svg+xml').ok, false);
  assert.equal(checkAvatar(new TextEncoder().encode('<html>'), 'image/png').ok, false);
  assert.equal(checkAvatar(new Uint8Array(0)).ok, false);
  const big = new Uint8Array(AVATAR_MAX_BYTES + 1);
  big.set([0xff, 0xd8, 0xff]);
  assert.equal(checkAvatar(big).ok, false);
});
