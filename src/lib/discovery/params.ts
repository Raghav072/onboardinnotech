import { academicStartYear } from '../academic-year.ts';
import { cleanSingleLine } from '../validation/auth.ts';

export type DirectoryKind = 'student' | 'alumni';

export const PAGE_SIZE = 12;
export const MAX_PAGE = 200;
export const MAX_TEXT_LENGTH = 60;
export const SORTS = ['name', 'name_desc', 'newest', 'oldest'] as const;
export type DirectorySort = (typeof SORTS)[number];

export interface DirectoryFilters {
  q: string | null;
  programme: string | null;
  skill: string | null;
  company: string | null; // alumni only
  yearOfStudy: 1 | 2 | 3 | 4 | null; // students only
  graduationYear: number | null; // alumni only
  mentoring: boolean; // alumni only
  sort: DirectorySort;
}

export interface ParsedDirectoryRequest {
  kind: DirectoryKind;
  filters: DirectoryFilters;
  page: number;
  /** Human-readable notes about inputs that were dropped, shown to the user. */
  ignored: string[];
}

export type RawParams = Record<string, string | string[] | undefined>;

function first(raw: RawParams, key: string): string | undefined {
  const v = raw[key];
  return Array.isArray(v) ? v[0] : v;
}

function text(raw: RawParams, key: string, label: string, ignored: string[]): string | null {
  const v = cleanSingleLine(first(raw, key));
  if (v === '') return null;
  if (v.length > MAX_TEXT_LENGTH) {
    ignored.push(`${label} was longer than ${MAX_TEXT_LENGTH} characters and was ignored.`);
    return null;
  }
  return v;
}

/** Turns untrusted URL parameters into a validated request. Never throws; bad input is dropped. */
export function parseDirectoryParams(kind: DirectoryKind, raw: RawParams): ParsedDirectoryRequest {
  const ignored: string[] = [];

  const q = text(raw, 'q', 'The name search', ignored);
  const programme = text(raw, 'programme', 'The programme filter', ignored);
  const skill = text(raw, 'skill', 'The skills filter', ignored);
  const company = kind === 'alumni' ? text(raw, 'company', 'The company filter', ignored) : null;

  let yearOfStudy: DirectoryFilters['yearOfStudy'] = null;
  const yearRaw = kind === 'student' ? cleanSingleLine(first(raw, 'year')) : '';
  if (yearRaw !== '') {
    if (/^[1-4]$/.test(yearRaw)) yearOfStudy = Number(yearRaw) as 1 | 2 | 3 | 4;
    else ignored.push('The year filter was not a valid year and was ignored.');
  }

  let graduationYear: number | null = null;
  const gradRaw = kind === 'alumni' ? cleanSingleLine(first(raw, 'grad')) : '';
  if (gradRaw !== '') {
    const n = /^\d{4}$/.test(gradRaw) ? Number(gradRaw) : NaN;
    if (n >= 2000 && n <= 2100) graduationYear = n;
    else ignored.push('The graduation year must be a four-digit year from 2000 to 2100 and was ignored.');
  }

  const mentoring = kind === 'alumni' && first(raw, 'mentoring') === '1';

  const sortRaw = cleanSingleLine(first(raw, 'sort'));
  const sort: DirectorySort = (SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as DirectorySort) : 'name';
  if (sortRaw !== '' && sort === 'name' && sortRaw !== 'name') ignored.push('That sort order is not available; sorting by name instead.');

  let page = 1;
  const pageRaw = cleanSingleLine(first(raw, 'page'));
  if (pageRaw !== '') {
    const n = /^\d{1,4}$/.test(pageRaw) ? Number(pageRaw) : NaN;
    if (n >= 1 && n <= MAX_PAGE) page = n;
    else ignored.push('That page number is not valid; showing the first page.');
  }

  return { kind, filters: { q, programme, skill, company, yearOfStudy, graduationYear, mentoring, sort }, page, ignored };
}

export function hasActiveFilters(f: DirectoryFilters): boolean {
  return Boolean(f.q || f.programme || f.skill || f.company || f.yearOfStudy || f.graduationYear || f.mentoring);
}

/** Arguments for public.search_public_profiles. Only these named arguments are ever sent. */
export function toRpcArgs(req: ParsedDirectoryRequest, now: Date = new Date()): Record<string, unknown> {
  const f = req.filters;
  return {
    p_kind: req.kind,
    p_query: f.q,
    p_programme: f.programme,
    p_skill: f.skill,
    p_company: f.company,
    // The calendar rule (Asia/Kolkata, 1 July cutover) comes from src/lib/academic-year.ts.
    p_admission_year: f.yearOfStudy ? academicStartYear(now) - f.yearOfStudy + 1 : null,
    p_year_of_study: f.yearOfStudy,
    p_graduation_year: f.graduationYear,
    p_mentoring: f.mentoring ? true : null,
    p_sort: f.sort,
    p_limit: PAGE_SIZE,
    p_offset: (req.page - 1) * PAGE_SIZE,
  };
}

/** Link to a page of results, carrying only non-default parameters. */
export function directoryHref(basePath: string, filters: DirectoryFilters, page: number): string {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.programme) p.set('programme', filters.programme);
  if (filters.skill) p.set('skill', filters.skill);
  if (filters.company) p.set('company', filters.company);
  if (filters.yearOfStudy) p.set('year', String(filters.yearOfStudy));
  if (filters.graduationYear) p.set('grad', String(filters.graduationYear));
  if (filters.mentoring) p.set('mentoring', '1');
  if (filters.sort !== 'name') p.set('sort', filters.sort);
  if (page > 1) p.set('page', String(page));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
