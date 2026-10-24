/** Optional sign-up restriction to specific email domains (server-side only). */
export function parseAllowedDomains(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));
}

/** Empty list means "no restriction". Matching is exact on the domain part. */
export function isAllowedEmailDomain(email: string, allowed: readonly string[]): boolean {
  if (allowed.length === 0) return true;
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  return allowed.includes(email.slice(at + 1).toLowerCase());
}
