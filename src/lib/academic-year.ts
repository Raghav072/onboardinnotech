/**
 * Academic-year calculation. See docs/academic-year.md for the full rule.
 *
 * IMPORTANT: in Milestone 1 this is a pure function used only for sample data
 * and tests. From Milestone 2 the authoritative calculation lives in the
 * database (derived from the stored admission_year); the browser never supplies
 * an academic year. The SQL version must match this one and be tested for parity.
 */

/** Month (1-12) in which a new academic year starts. ASSUMPTION: July. Confirm with KIET's calendar. */
export const ACADEMIC_YEAR_START_MONTH = 7;

/** The calendar is evaluated in India Standard Time, not the server's or browser's zone. */
export const ACADEMIC_CALENDAR_TIME_ZONE = 'Asia/Kolkata';

export type YearOfStudy = 1 | 2 | 3 | 4;

export type AcademicStanding =
  | { status: 'current'; year: YearOfStudy; source: 'calculated' | 'admin_override' }
  | { status: 'not_started' }
  | { status: 'completed' };

export type RingKey = 'year-1' | 'year-2' | 'year-3' | 'year-4' | 'alumni' | 'none';

export interface StandingInput {
  /** Calendar year the student joined, e.g. 2024. */
  admissionYear: number;
  /** Programme length in years (1-4). Default 4 (B.Tech). MBA is 2. */
  programmeDurationYears?: number;
  /** Authorised-administrator override for exceptional cases (repeat year, gap year). */
  adminOverrideYear?: number | null;
  /** Injectable clock for tests. */
  now?: Date;
}

/** The calendar year in which the academic year containing `now` started. */
export function academicStartYear(now: Date): number {
  if (Number.isNaN(now.getTime())) throw new RangeError('Invalid date');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACADEMIC_CALENDAR_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return month >= ACADEMIC_YEAR_START_MONTH ? year : year - 1;
}

function assertInt(value: number, min: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer between ${min} and ${max}`);
  }
}

export function computeAcademicStanding(input: StandingInput): AcademicStanding {
  const duration = input.programmeDurationYears ?? 4;
  assertInt(duration, 1, 4, 'programmeDurationYears');
  assertInt(input.admissionYear, 1990, 2100, 'admissionYear');

  const override = input.adminOverrideYear;
  if (override !== null && override !== undefined) {
    assertInt(override, 1, duration, 'adminOverrideYear');
    return { status: 'current', year: override as YearOfStudy, source: 'admin_override' };
  }

  const year = academicStartYear(input.now ?? new Date()) - input.admissionYear + 1;
  if (year < 1) return { status: 'not_started' };
  if (year > duration) return { status: 'completed' };
  return { status: 'current', year: year as YearOfStudy, source: 'calculated' };
}

export function ringKeyForStanding(standing: AcademicStanding | null): RingKey {
  if (standing && standing.status === 'current') return `year-${standing.year}` as RingKey;
  return 'none';
}

const ORDINALS: Record<YearOfStudy, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

export function describeStanding(standing: AcademicStanding): string {
  if (standing.status === 'current') return `${ORDINALS[standing.year]} year`;
  if (standing.status === 'completed') return 'Programme completed';
  return 'Not started';
}
