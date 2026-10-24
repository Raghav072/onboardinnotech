import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeAcademicStanding } from '../src/lib/academic-year.ts';

const fixturePath = new URL('../supabase/tests/fixtures/academic-year-parity.csv', import.meta.url);
const [header, ...rows] = readFileSync(fixturePath, 'utf8').trim().split(/\r?\n/);
const headers = header.split(',');
const fixtures = rows.map((line) => {
  const cells = line.split(',');
  return Object.fromEntries(headers.map((key, index) => [key, cells[index] ?? ''])) as Record<string, string>;
});

test('academic-year shared CSV fixture covers SQL/TypeScript parity cases', () => {
  assert.ok(fixtures.length >= 7, 'the shared fixture should retain boundary and programme cases');
  for (const fixture of fixtures) {
    const duration = /^\s*MBA\b/i.test(fixture.programme) ? 2 : 4;
    const standing = computeAcademicStanding({
      admissionYear: Number(fixture.admission_year),
      programmeDurationYears: duration,
      now: new Date(fixture.instant_utc),
    });
    assert.equal(standing.status, fixture.expected_status, `${fixture.admission_year}/${fixture.programme} at ${fixture.instant_utc}`);
    assert.equal(standing.status === 'current' ? standing.year : '', fixture.expected_year === '' ? '' : Number(fixture.expected_year), `${fixture.instant_utc} year`);
  }
});
