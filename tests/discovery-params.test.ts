// Pure unit tests: validation of untrusted URL parameters and the arguments sent to the database.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directoryHref, hasActiveFilters, MAX_PAGE, MAX_TEXT_LENGTH, PAGE_SIZE, parseDirectoryParams, toRpcArgs } from '../src/lib/discovery/params.ts';

test('defaults: no parameters means first page, name sort, no filters', () => {
  const r = parseDirectoryParams('student', {});
  assert.equal(r.page, 1);
  assert.equal(r.filters.sort, 'name');
  assert.equal(hasActiveFilters(r.filters), false);
  assert.deepEqual(r.ignored, []);
});

test('text is trimmed, whitespace collapsed, control and bidi-override characters removed', () => {
  const r = parseDirectoryParams('student', { q: '  Ada\u0000   \u202eLovelace  ', skill: '\n\tPython\r\n' });
  assert.equal(r.filters.q, 'Ada Lovelace');
  assert.equal(r.filters.skill, 'Python');
});

test('over-long text is dropped with a notice, not truncated into a different search', () => {
  const r = parseDirectoryParams('student', { q: 'x'.repeat(MAX_TEXT_LENGTH + 1), programme: 'y'.repeat(MAX_TEXT_LENGTH) });
  assert.equal(r.filters.q, null);
  assert.equal(r.filters.programme, 'y'.repeat(MAX_TEXT_LENGTH));
  assert.equal(r.ignored.length, 1);
});

test('repeated parameters (arrays) use the first value only', () => {
  const r = parseDirectoryParams('student', { q: ['first', 'second'] });
  assert.equal(r.filters.q, 'first');
});

test('year of study accepts 1 to 4 for students only', () => {
  assert.equal(parseDirectoryParams('student', { year: '3' }).filters.yearOfStudy, 3);
  for (const bad of ['0', '5', 'x', '1; drop table profiles', '-1', '2.5']) {
    const r = parseDirectoryParams('student', { year: bad });
    assert.equal(r.filters.yearOfStudy, null, bad);
    assert.equal(r.ignored.length, 1, bad);
  }
  assert.equal(parseDirectoryParams('alumni', { year: '2' }).filters.yearOfStudy, null);
});

test('alumni-only filters are ignored on the student directory and vice versa', () => {
  const s = parseDirectoryParams('student', { company: 'Acme', grad: '2024', mentoring: '1' });
  assert.equal(s.filters.company, null);
  assert.equal(s.filters.graduationYear, null);
  assert.equal(s.filters.mentoring, false);
  const a = parseDirectoryParams('alumni', { company: 'Acme', grad: '2024', mentoring: '1' });
  assert.deepEqual([a.filters.company, a.filters.graduationYear, a.filters.mentoring], ['Acme', 2024, true]);
});

test('graduation year must be a four-digit year in range', () => {
  for (const bad of ['1999', '2101', '24', 'abcd', '2024x', '02024']) {
    assert.equal(parseDirectoryParams('alumni', { grad: bad }).filters.graduationYear, null, bad);
  }
});

test('sort is allow-listed; anything else falls back to name with a notice', () => {
  for (const ok of ['name', 'name_desc', 'newest', 'oldest']) assert.equal(parseDirectoryParams('student', { sort: ok }).filters.sort, ok);
  const r = parseDirectoryParams('student', { sort: 'display_name; select 1' });
  assert.equal(r.filters.sort, 'name');
  assert.equal(r.ignored.length, 1);
});

test('page must be a whole number from 1 to the maximum', () => {
  assert.equal(parseDirectoryParams('student', { page: '7' }).page, 7);
  assert.equal(parseDirectoryParams('student', { page: String(MAX_PAGE) }).page, MAX_PAGE);
  for (const bad of ['0', '-3', '1.5', 'abc', String(MAX_PAGE + 1), '99999999']) {
    const r = parseDirectoryParams('student', { page: bad });
    assert.equal(r.page, 1, bad);
    assert.equal(r.ignored.length, 1, bad);
  }
});

test('RPC arguments: fixed allow-list of names, page size and offset derived from page', () => {
  const req = parseDirectoryParams('student', { q: 'ada', page: '3' });
  const args = toRpcArgs(req, new Date('2026-10-23T09:00:00Z'));
  assert.deepEqual(Object.keys(args).sort(), [
    'p_admission_year', 'p_company', 'p_graduation_year', 'p_kind', 'p_limit', 'p_mentoring',
    'p_offset', 'p_programme', 'p_query', 'p_skill', 'p_sort', 'p_year_of_study',
  ]);
  assert.equal(args.p_kind, 'student');
  assert.equal(args.p_limit, PAGE_SIZE);
  assert.equal(args.p_offset, 2 * PAGE_SIZE);
  assert.equal(args.p_query, 'ada');
});

test('year-of-study filter uses the shared academic-year rule, including the IST 1 July cutover', () => {
  const year2 = parseDirectoryParams('student', { year: '2' });
  // Before the cutover (still the 2025 academic year): 2nd year means admitted in 2024.
  assert.equal(toRpcArgs(year2, new Date('2026-06-30T18:29:59Z')).p_admission_year, 2024);
  // From 00:00 IST on 1 July 2026 the 2026 academic year has started: 2nd year means admitted in 2025.
  assert.equal(toRpcArgs(year2, new Date('2026-06-30T18:30:00Z')).p_admission_year, 2025);
  const year1 = parseDirectoryParams('student', { year: '1' });
  assert.equal(toRpcArgs(year1, new Date('2026-10-23T09:00:00Z')).p_admission_year, 2026);
  assert.equal(toRpcArgs(parseDirectoryParams('student', {})).p_admission_year, null);
});

test('mentoring is sent as true or null, never false', () => {
  assert.equal(toRpcArgs(parseDirectoryParams('alumni', { mentoring: '1' })).p_mentoring, true);
  assert.equal(toRpcArgs(parseDirectoryParams('alumni', { mentoring: '0' })).p_mentoring, null);
});

test('links carry only non-default values and encode user text', () => {
  const r = parseDirectoryParams('student', { q: 'a&b=c', page: '2', sort: 'newest' });
  assert.equal(directoryHref('/discover', r.filters, 1), '/discover?q=a%26b%3Dc&sort=newest');
  assert.equal(directoryHref('/discover', r.filters, 2), '/discover?q=a%26b%3Dc&sort=newest&page=2');
  assert.equal(directoryHref('/alumni', parseDirectoryParams('alumni', {}).filters, 1), '/alumni');
});
