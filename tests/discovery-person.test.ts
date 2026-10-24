import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromMock, fromPublicProfile, programmeDurationYears, standingForMember } from '../src/lib/discovery/person.ts';
import type { DirectoryEntry } from '../src/lib/discovery/person.ts';

const OCT_2026 = new Date('2026-10-23T09:00:00Z');
const entry = (over: Partial<DirectoryEntry> = {}): DirectoryEntry => ({
  id: '00000000-0000-4000-8000-00000000000a', displayName: 'Ada', kind: 'student', programme: 'B.Tech CSE', admissionYear: 2024,
  graduationYear: null, company: null, jobTitle: null, skills: [], openToMentoring: false, isVerified: false, ...over,
});

test('academic year is shown through the shared utility, with ring and wording', () => {
  const v = fromPublicProfile(entry({ admissionYear: 2024 }), OCT_2026);
  assert.deepEqual(v.standing, { status: 'current', year: 3, source: 'calculated' });
  assert.equal(v.ring, 'year-3');
  assert.equal(v.isSample, false);
});

test('cutover: the same student is 2nd year before 1 July IST and 3rd year after', () => {
  const before = fromPublicProfile(entry({ admissionYear: 2024 }), new Date('2026-06-30T18:29:59Z'));
  const after = fromPublicProfile(entry({ admissionYear: 2024 }), new Date('2026-06-30T18:30:00Z'));
  assert.equal(before.ring, 'year-2');
  assert.equal(after.ring, 'year-3');
});

test('programme length: MBA is two years, others four (parity table with public.programme_duration_years)', () => {
  const table: [string | null, number][] = [
    ['MBA', 2], ['mba', 2], ['  MBA (Finance)', 2], ['MBA-Tech', 2], ['B.Tech CSE', 4], ['Embark', 4], ['Mbala', 4], ['', 4], [null, 4],
  ];
  for (const [programme, years] of table) assert.equal(programmeDurationYears(programme), years, String(programme));
  // An MBA admitted in 2024 has finished by October 2026; a B.Tech student admitted in 2024 has not.
  assert.deepEqual(standingForMember('student', 2024, 'MBA', OCT_2026), { status: 'completed' });
  assert.equal(standingForMember('student', 2024, 'B.Tech CSE', OCT_2026)?.status, 'current');
});

test('students without an admission year, and out-of-range years, get no ring instead of a guessed one', () => {
  assert.equal(fromPublicProfile(entry({ admissionYear: null }), OCT_2026).ring, 'none');
  assert.equal(fromPublicProfile(entry({ admissionYear: 1850 }), OCT_2026).ring, 'none');
});

test('alumni have the alumni ring and no year of study', () => {
  const v = fromPublicProfile(entry({ kind: 'alumni', admissionYear: 2020, graduationYear: 2024, company: 'Acme', jobTitle: 'Engineer' }), OCT_2026);
  assert.equal(v.ring, 'alumni');
  assert.equal(v.standing, null);
  assert.equal(v.role, 'Engineer');
});

test('sample people are flagged as samples; real people never are', () => {
  const m = fromMock({ id: 'sample-x', name: 'X', kind: 'student', programme: 'B.Tech CSE', admissionYear: 2026, bio: '', skills: [], projects: [], experience: [] }, OCT_2026);
  assert.equal(m.isSample, true);
  assert.equal(m.ring, 'year-1');
  assert.equal(fromPublicProfile(entry(), OCT_2026).isSample, false);
});
