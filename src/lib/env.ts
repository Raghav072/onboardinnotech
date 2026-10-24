/**
 * Supabase public configuration. Only the URL and the anon (publishable) key are read
 * here: both are designed to be exposed to browsers and are protected by Row Level
 * Security. The service-role key is NEVER read anywhere in this app.
 *
 * NEXT_PUBLIC_* variables must be referenced statically so Next can inline them.
 */
export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

type EnvSource = Record<string, string | undefined>;

function staticSource(): EnvSource {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/** True when a key is a service-role / secret key that must never be used client-side. */
export function looksLikeSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3 || !parts[1]) return false;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const payload = JSON.parse(json) as { role?: unknown };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

/** Returns validated config, or null when Supabase is not (safely) configured. */
export function getSupabasePublicEnv(source: EnvSource = staticSource()): SupabasePublicEnv | null {
  const url = source.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = source.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) return null;
  if (anonKey.length < 20 || /\s/.test(anonKey)) return null;
  if (looksLikeSecretKey(anonKey)) return null; // refuse a secret key in a public variable
  return { url: parsed.origin, anonKey };
}

export function isSupabaseConfigured(source?: EnvSource): boolean {
  return getSupabasePublicEnv(source) !== null;
}
