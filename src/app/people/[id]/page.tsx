import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProfileView } from '../../../components/people/ProfileView';
import { ButtonLink } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MockBanner } from '../../../components/ui/MockBanner';
import { fromMock, fromPublicProfile } from '../../../lib/discovery/person';
import { isSupabaseConfigured } from '../../../lib/env';
import { getMockPerson } from '../../../lib/mock/people';
import { getPublicProfile } from '../../../lib/profile/queries';
import { UUID_RE } from '../../../lib/profile/types';
import { getVerifiedUser } from '../../../lib/supabase/server';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  // Real profiles need a signed-in query, so the tab title stays generic rather than querying twice.
  if (isSupabaseConfigured()) return { title: 'Member profile' };
  const person = getMockPerson(id);
  return { title: person ? person.name : 'Profile' };
}

/**
 * Configured: only real profiles, read through the public_profiles view with the caller's own
 * session (signed-in members only; private, unapproved or rejected members come back as 404).
 * Not configured: the Milestone 1 sample profiles, exactly as before.
 */
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    const sample = getMockPerson(id);
    if (!sample) notFound();
    return (
      <div className="space-y-6">
        <MockBanner>This profile is fictional sample data.</MockBanner>
        <ProfileView person={fromMock(sample)} />
      </div>
    );
  }

  if (!UUID_RE.test(id)) notFound();
  const ctx = await getVerifiedUser();
  if (!ctx) {
    return (
      <EmptyState
        icon="lock"
        title="Sign in to view this profile"
        headingLevel={1}
        action={<ButtonLink href={`/login?next=${encodeURIComponent(`/people/${id}`)}`}>Sign in</ButtonLink>}
      >
        Member profiles are only visible to signed-in members.
      </EmptyState>
    );
  }
  const profile = await getPublicProfile(ctx.supabase, id);
  if (!profile) notFound();
  const eligibility = await ctx.supabase.rpc('can_message_member', { p_target: id });
  const messageHref = !eligibility.error && eligibility.data === true ? `/messages?to=${id}` : null;
  return <ProfileView person={fromPublicProfile(profile)} messageHref={messageHref} />;
}
