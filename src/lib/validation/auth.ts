export type Result<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };

export interface FieldSource {
  get(name: string): unknown;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const e = raw.trim().toLowerCase();
  if (e.length < 6 || e.length > 254 || !EMAIL_RE.test(e)) return null;
  return e;
}

/** bcrypt (used by Supabase Auth) ignores bytes past 72, so cap there. */
export function passwordError(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'Enter a password.';
  if (raw.length < 10) return 'Use at least 10 characters.';
  if (new TextEncoder().encode(raw).length > 72) return 'Use at most 72 characters.';
  return null;
}

export function parseSignIn(form: FieldSource): Result<{ email: string; password: string }> {
  const errors: Record<string, string> = {};
  const email = normaliseEmail(form.get('email'));
  if (!email) errors.email = 'Enter a valid email address.';
  const password = form.get('password');
  if (typeof password !== 'string' || password.length === 0 || password.length > 256) errors.password = 'Enter your password.';
  if (Object.keys(errors).length || !email || typeof password !== 'string') return { ok: false, errors };
  return { ok: true, data: { email, password } };
}

export function parseSignUp(form: FieldSource): Result<{ email: string; password: string; displayName: string }> {
  const errors: Record<string, string> = {};
  const email = normaliseEmail(form.get('email'));
  if (!email) errors.email = 'Enter a valid email address.';
  const pwErr = passwordError(form.get('password'));
  if (pwErr) errors.password = pwErr;
  const name = cleanSingleLine(form.get('displayName'));
  if (!name || name.length > 80) errors.displayName = 'Enter your name (up to 80 characters).';
  if (Object.keys(errors).length || !email || !name) return { ok: false, errors };
  return { ok: true, data: { email, password: form.get('password') as string, displayName: name } };
}

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F‪-‮⁦-⁩]/g;

/** Trim, drop control and bidi-override characters, collapse whitespace. */
export function cleanSingleLine(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
}
