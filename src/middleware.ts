import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static assets and image files.
  matcher: ['/((?!_next/static|_next/image|favicon.svg|icon.svg|apple-icon.png|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
