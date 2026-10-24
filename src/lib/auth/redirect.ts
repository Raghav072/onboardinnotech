/**
 * Open-redirect protection for the `next` parameter used after sign-in and in the
 * auth callback. Only same-site absolute paths are accepted.
 */
export function safeNextPath(raw: unknown, fallback = '/profile'): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.includes('\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, 'http://internal.invalid');
  } catch {
    return fallback;
  }
  if (url.origin !== 'http://internal.invalid') return fallback;
  return url.pathname + url.search;
}
