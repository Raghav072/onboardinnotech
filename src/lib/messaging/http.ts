import { NextResponse } from 'next/server';

/** Messaging endpoints return private user data and must never be cached by browsers or proxies. */
export function privateNoStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('Vary', 'Cookie');
  return NextResponse.json(body, { ...init, headers });
}
