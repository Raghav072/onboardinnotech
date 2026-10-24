import type { NextConfig } from 'next';
import { getSupabasePublicEnv } from './src/lib/env';

const isDev = process.env.NODE_ENV !== 'production';
const supabaseOrigin = getSupabasePublicEnv()?.url ?? null;

/**
 * Content-Security-Policy. Next.js injects inline bootstrap scripts, so script-src
 * needs 'unsafe-inline' until a nonce-based policy is added (tracked as a later
 * hardening step); everything else is locked to this origin plus the configured
 * Supabase project (API + signed avatar URLs). Dev adds 'unsafe-eval' for React
 * refresh only.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin}` : ''}`,
  "font-src 'self'",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin} ${supabaseOrigin.replace(/^http/, 'ws')}` : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Avatar uploads go through a Server Action; the default 1 MB body limit is below our 2 MB image cap.
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
