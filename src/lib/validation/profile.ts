import { cleanSingleLine } from './auth.ts';
import type { FieldSource, Result } from './auth.ts';

export interface ProfileInput {
  displayName: string;
  kind: 'student' | 'alumni';
  programme: string | null;
  admissionYear: number | null;
  graduationYear: number | null;
  company: string | null;
  jobTitle: string | null;
  bio: string;
  skills: string[];
  openToMentoring: boolean;
  isPublic: boolean;
  phone: string | null;
}

// eslint-disable-next-line no-control-regex
const BIO_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

function optionalText(raw: unknown, max: number, label: string, errors: Record<string, string>, key: string): string | null {
  const v = cleanSingleLine(raw);
  if (v === '') return null;
  if (v.length > max) errors[key] = `${label} must be at most ${max} characters.`;
  return v;
}

function optionalYear(raw: unknown, label: string, errors: Record<string, string>, key: string): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === '') return null;
  if (!/^\d{4}$/.test(s)) {
    errors[key] = `${label} must be a four-digit year.`;
    return null;
  }
  const n = Number(s);
  if (n < 2000 || n > 2100) errors[key] = `${label} must be between 2000 and 2100.`;
  return n;
}

export function parseSkills(raw: unknown): { skills: string[]; error?: string } {
  if (typeof raw !== 'string') return { skills: [] };
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const part of raw.split(',')) {
    const s = cleanSingleLine(part);
    if (!s) continue;
    if (s.length > 30) return { skills: [], error: 'Each skill must be at most 30 characters.' };
    const k = s.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      skills.push(s);
    }
  }
  if (skills.length > 20) return { skills: [], error: 'Add at most 20 skills.' };
  return { skills };
}

/** Parses the profile form. Unknown fields are ignored (no mass assignment). */
export function parseProfileForm(form: FieldSource): Result<ProfileInput> {
  const errors: Record<string, string> = {};

  const displayName = cleanSingleLine(form.get('displayName'));
  if (!displayName) errors.displayName = 'Enter your name.';
  else if (displayName.length > 80) errors.displayName = 'Name must be at most 80 characters.';

  const kindRaw = form.get('kind');
  const kind = kindRaw === 'alumni' ? 'alumni' : kindRaw === 'student' ? 'student' : null;
  if (!kind) errors.kind = 'Choose student or alumni.';

  const programme = optionalText(form.get('programme'), 100, 'Programme', errors, 'programme');
  const company = optionalText(form.get('company'), 100, 'Company', errors, 'company');
  const jobTitle = optionalText(form.get('jobTitle'), 100, 'Role', errors, 'jobTitle');
  const admissionYear = optionalYear(form.get('admissionYear'), 'Admission year', errors, 'admissionYear');
  const graduationYear = optionalYear(form.get('graduationYear'), 'Graduation year', errors, 'graduationYear');

  const bioRaw = form.get('bio');
  const bio = typeof bioRaw === 'string' ? bioRaw.replace(/\r\n?/g, '\n').replace(BIO_CONTROL, '').trim() : '';
  if (bio.length > 500) errors.bio = 'Bio must be at most 500 characters.';

  const sk = parseSkills(form.get('skills'));
  if (sk.error) errors.skills = sk.error;

  const phoneRaw = cleanSingleLine(form.get('phone'));
  const phone = phoneRaw === '' ? null : phoneRaw;
  if (phone !== null && !PHONE_RE.test(phone)) errors.phone = 'Enter a valid phone number or leave it blank.';

  if (Object.keys(errors).length || !kind) return { ok: false, errors };
  return {
    ok: true,
    data: {
      displayName,
      kind,
      programme,
      admissionYear,
      graduationYear,
      company,
      jobTitle,
      bio,
      skills: sk.skills,
      openToMentoring: form.get('openToMentoring') === 'on',
      isPublic: form.get('isPublic') === 'on',
      phone,
    },
  };
}

/**
 * Explicit allow-list mapping to DB columns. Privileged columns (role,
 * verification_status, id, avatar_path) can never be produced from user input here.
 */
export function toProfileRow(p: ProfileInput) {
  return {
    display_name: p.displayName,
    kind: p.kind,
    programme: p.programme,
    admission_year: p.admissionYear,
    graduation_year: p.graduationYear,
    company: p.company,
    job_title: p.jobTitle,
    bio: p.bio,
    skills: p.skills,
    open_to_mentoring: p.openToMentoring,
    is_public: p.isPublic,
  };
}
