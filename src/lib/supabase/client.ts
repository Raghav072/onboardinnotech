'use client';
import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicEnv } from '../env';

/**
 * Browser Supabase client (anon key + the signed-in user's session; every query is
 * subject to Row Level Security). Milestone 2 pages talk to Supabase through server
 * actions, so nothing imports this yet; it exists for later realtime / client reads.
 */
export function createSupabaseBrowserClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return createBrowserClient(env.url, env.anonKey);
}
