import { computeAcademicStanding, ringKeyForStanding } from '../academic-year.ts';
import type { AcademicStanding, RingKey } from '../academic-year.ts';
import type { PublicProfile } from '../profile/types.ts';

/** What a directory card or profile page needs to draw one person. Nothing private fits in here. */
export interface PersonView {
  id: string;
  name: string;
  kind: 'student' | 'alumni';
  programme: string | null;
  /** Students only; null for alumni or when no admission year is set. */
  standing: AcademicStanding | null;
  ring: RingKey;
  graduationYear: number | null;
  company: string | null;
  role: string | null;
  openToMentoring: boolean;
  bio: string;
  skills: string[];
  isVerified: boolean;
  /** True only for the fictional Milestone 1 sample people. */
  isSample: boolean;
  projects: string[];
  experience: { title: string; detail: string }[];
}

/** The fields a directory result carries. A subset of PublicProfile (no bio, no avatar path). */
export type DirectoryEntry = Pick<
  PublicProfile,
  'id' | 'displayName' | 'kind' | 'programme' | 'admissionYear' | 'graduationYear' | 'company' | 'jobTitle' | 'skills' | 'openToMentoring' | 'isVerified'
>;

/**
 * Programme length in years. ASSUMPTION (docs/academic-year.md): MBA is 2 years, everything
 * else 4. Programme is free text today. Must match public.programme_duration_years() in
 * supabase/migrations/0003_discovery.sql.
 */
export function programmeDurationYears(programme: string | null | undefined): 2 | 4 {
  return programme && /^\s*MBA\b/i.test(programme) ? 2 : 4;
}

/** Standing for a student, from the stored admission year, using the shared IST/1-July rule. */
export function standingForMember(
  kind: 'student' | 'alumni',
  admissionYear: number | null,
  programme: string | null,
  now: Date = new Date(),
): AcademicStanding | null {
  if (kind !== 'student' || admissionYear === null) return null;
  try {
    return computeAcademicStanding({ admissionYear, programmeDurationYears: programmeDurationYears(programme), now });
  } catch {
    return null; // an out-of-range value never becomes a guessed year
  }
}

export function fromPublicProfile(p: DirectoryEntry & { bio?: string }, now: Date = new Date()): PersonView {
  const standing = standingForMember(p.kind, p.admissionYear, p.programme, now);
  return {
    id: p.id,
    name: p.displayName,
    kind: p.kind,
    programme: p.programme,
    standing,
    ring: p.kind === 'alumni' ? 'alumni' : ringKeyForStanding(standing),
    graduationYear: p.graduationYear,
    company: p.company,
    role: p.jobTitle,
    openToMentoring: p.openToMentoring,
    bio: p.bio ?? '',
    skills: p.skills,
    isVerified: p.isVerified,
    isSample: false,
    projects: [],
    experience: [],
  };
}

/** Minimal shape of the Milestone 1 sample person (kept structural so this file has no mock import). */
interface MockLike {
  id: string;
  name: string;
  kind: 'student' | 'alumni';
  programme: string;
  admissionYear?: number;
  programmeDurationYears?: number;
  graduationYear?: number;
  company?: string;
  role?: string;
  openToMentoring?: boolean;
  bio: string;
  skills: string[];
  projects: string[];
  experience: { title: string; detail: string }[];
}

export function fromMock(m: MockLike, now: Date = new Date()): PersonView {
  let standing: AcademicStanding | null = null;
  if (m.kind === 'student' && m.admissionYear !== undefined) {
    standing = computeAcademicStanding({ admissionYear: m.admissionYear, programmeDurationYears: m.programmeDurationYears, now });
  }
  return {
    id: m.id,
    name: m.name,
    kind: m.kind,
    programme: m.programme,
    standing,
    ring: m.kind === 'alumni' ? 'alumni' : ringKeyForStanding(standing),
    graduationYear: m.graduationYear ?? null,
    company: m.company ?? null,
    role: m.role ?? null,
    openToMentoring: m.openToMentoring ?? false,
    bio: m.bio,
    skills: m.skills,
    isVerified: false,
    isSample: true,
    projects: m.projects,
    experience: m.experience,
  };
}
