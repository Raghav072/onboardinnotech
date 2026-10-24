'use server';

import { redirect } from 'next/navigation';
import { isAllowedEmailDomain, parseAllowedDomains } from '../../lib/auth/domain';
import { safeNextPath } from '../../lib/auth/redirect';
import type { FormState } from '../../lib/form-state';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { parseSignIn, parseSignUp } from '../../lib/validation/auth';

const NOT_CONFIGURED: FormState = { error: 'Sign-in is not configured in this environment yet.' };

function siteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    return u.protocol === 'https:' || (local && u.protocol === 'http:') ? u.origin : null;
  } catch {
    return null;
  }
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseSignIn(formData);
  if (!parsed.ok) return { fieldErrors: parsed.errors };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // One generic message: never reveal whether the email exists.
  if (error) return { error: 'Incorrect email or password.' };
  redirect(safeNextPath(formData.get('next')));
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseSignUp(formData);
  if (!parsed.ok) return { fieldErrors: parsed.errors };
  const allowed = parseAllowedDomains(process.env.ALLOWED_EMAIL_DOMAINS);
  if (!isAllowedEmailDomain(parsed.data.email, allowed)) {
    return { fieldErrors: { email: `Sign-up is limited to these email domains: ${allowed.join(', ')}.` } };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const base = siteUrl();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName }, // display name only; role is never read from metadata
      ...(base ? { emailRedirectTo: `${base}/auth/callback?next=/profile` } : {}),
    },
  });
  if (error) {
    if (error.code === 'weak_password') return { fieldErrors: { password: 'Choose a stronger password.' } };
    if (error.code !== 'user_already_exists') return { error: 'We could not create the account. Please try again in a moment.' };
  }
  // Same message whether or not the email is already registered (no account enumeration).
  return { ok: true, message: 'Check your email for a confirmation link to finish creating your account.' };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect('/');
}
