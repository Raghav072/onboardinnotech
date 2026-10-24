import Link from 'next/link';
import { signOutAction } from '../../app/auth/actions';
import { isSupabaseConfigured } from '../../lib/env';
import { getVerifiedUser } from '../../lib/supabase/server';
import { buttonClasses } from '../ui/Button';

const CLASSES = 'inline-flex min-h-11 shrink-0 items-center rounded-full border border-ink/25 px-4 text-sm font-semibold';

/**
 * Sign in / Sign out control. When Supabase is not configured it renders the same
 * disabled button as before and never touches cookies, so pages stay static.
 */
export async function AuthButton() {
  if (!isSupabaseConfigured()) {
    return (
      <button type="button" disabled title="Sign-in is not configured in this environment" className={`${CLASSES} disabled:cursor-not-allowed disabled:opacity-60`}>
        Sign in
      </button>
    );
  }
  const ctx = await getVerifiedUser();
  if (!ctx) {
    return (
      <Link href="/login" className={CLASSES}>
        Sign in
      </Link>
    );
  }
  return (
    <form action={signOutAction}>
      <button type="submit" className={`${buttonClasses('secondary')} shrink-0`}>
        Sign out
      </button>
    </form>
  );
}
