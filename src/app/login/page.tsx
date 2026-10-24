import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForms } from '../../components/auth/AuthForms';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormMessage } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { safeNextPath } from '../../lib/auth/redirect';
import { isSupabaseConfigured } from '../../lib/env';
import { getVerifiedUser } from '../../lib/supabase/server';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sign in" />
        <EmptyState icon="lock" title="Sign-in is not configured" headingLevel={2}>
          This environment has no Supabase project connected yet. See docs/supabase-setup.md.
        </EmptyState>
      </div>
    );
  }
  if (await getVerifiedUser()) redirect(next);
  return (
    <div className="space-y-6">
      <PageHeader title="Sign in to ONBOARD" intro="Use your email address. New members confirm their email before first sign-in." />
      {sp.error === 'callback' ? <FormMessage>That confirmation link is invalid or has expired. Please try again.</FormMessage> : null}
      <AuthForms next={next} />
    </div>
  );
}
