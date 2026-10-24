import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  academicStartYear,
  computeAcademicStanding,
  describeStanding,
  ringKeyForStanding,
} from '../src/lib/academic-year.ts';

const OCT_2026 = new Date('2026-10-23T09:00:00Z');

test('year of study follows admission year after the July cutover', () => {
  const year = (admissionYear: number) => computeAcademicStanding({ admissionYear, now: OCT_2026 });
  assert.deepEqual(year(2026), { status: 'current', year: 1, source: 'calculated' });
  assert.deepEqual(year(2025), { status: 'current', year: 2, source: 'calculated' });
  assert.deepEqual(year(2024), { status: 'current', year: 3, source: 'calculated' });
  assert.deepEqual(year(2023), { status: 'current', year: 4, source: 'calculated' });
});

test('before July the previous academic year is still running', () => {
  const march = new Date('2026-03-15T09:00:00Z');
  assert.deepEqual(computeAcademicStanding({ admissionYear: 2025, now: march }), { status: 'current', year: 1, source: 'calculated' });
});

test('cutover is evaluated in India Standard Time', () => {
  // 23:59:59 IST on 30 June, then midnight IST on 1 July.
  assert.equal(academicStartYear(new Date('2026-06-30T18:29:59Z')), 2025);
  assert.equal(academicStartYear(new Date('2026-06-30T18:30:00Z')), 2026);
});

test('future admission is not started; past programme end is completed', () => {
  assert.deepEqual(computeAcademicStanding({ admissionYear: 2027, now: OCT_2026 }), { status: 'not_started' });
  assert.deepEqual(computeAcademicStanding({ admissionYear: 2022, now: OCT_2026 }), { status: 'completed' });
});

test('shorter programmes (MBA, 2 years) complete sooner', () => {
  const mba = (admissionYear: number) => computeAcademicStanding({ admissionYear, programmeDurationYears: 2, now: OCT_2026 });
  assert.deepEqual(mba(2025), { status: 'current', year: 2, source: 'calculated' });
  assert.deepEqual(mba(2024), { status: 'completed' });
});

test('administrator override wins and is marked as such', () => {
  const s = computeAcademicStanding({ admissionYear: 2023, adminOverrideYear: 3, now: OCT_2026 });
  assert.deepEqual(s, { status: 'current', year: 3, source: 'admin_override' });
});

test('invalid inputs throw instead of guessing', () => {
  assert.throws(() => computeAcademicStanding({ admissionYear: 2024.5, now: OCT_2026 }), RangeError);
  assert.throws(() => computeAcademicStanding({ admissionYear: 2024, programmeDurationYears: 5, now: OCT_2026 }), RangeError);
  assert.throws(() => computeAcademicStanding({ admissionYear: 2024, adminOverrideYear: 0, now: OCT_2026 }), RangeError);
  assert.throws(() => computeAcademicStanding({ admissionYear: 2024, programmeDurationYears: 2, adminOverrideYear: 3, now: OCT_2026 }), RangeError);
  assert.throws(() => academicStartYear(new Date('not a date')), RangeError);
});

test('rings come only from a current standing; no standing never becomes a year', () => {
  assert.equal(ringKeyForStanding({ status: 'current', year: 2, source: 'calculated' }), 'year-2');
  assert.equal(ringKeyForStanding({ status: 'completed' }), 'none');
  assert.equal(ringKeyForStanding({ status: 'not_started' }), 'none');
  assert.equal(ringKeyForStanding(null), 'none');
});

test('standing is described in words as well as colour', () => {
  assert.equal(describeStanding({ status: 'current', year: 1, source: 'calculated' }), '1st year');
  assert.equal(describeStanding({ status: 'current', year: 3, source: 'calculated' }), '3rd year');
});
