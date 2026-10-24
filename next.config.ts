
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseOrigin: string | null = null;

if (supabaseUrl) {
  try {
    supabaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    supabaseOrigin = null;
  }
}

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
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: '3mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
