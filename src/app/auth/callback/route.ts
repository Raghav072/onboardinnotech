import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { safeNextPath } from '../../../lib/auth/redirect';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

/** Email-confirmation / PKCE callback: exchanges the one-time code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNextPath(searchParams.get('next')); // same-site paths only
  const code = searchParams.get('code');
  // Redirect to our own configured site URL when set, else to the request origin.
  let base = origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const u = new URL(configured);
      if (u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1') base = u.origin;
    } catch {
      /* fall back to request origin */
    }
  }
  if (code && code.length <= 512) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, base));
    }
  }
  return NextResponse.redirect(new URL('/login?error=callback', base));
}
