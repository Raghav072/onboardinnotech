import type { Metadata } from 'next';
import { ProfileEditor } from '../../components/profile/ProfileEditor';
import { ProfileView } from '../../components/people/ProfileView';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { MockBanner } from '../../components/ui/MockBanner';
import { PageHeader } from '../../components/ui/PageHeader';
import { fromMock } from '../../lib/discovery/person';
import { isSupabaseConfigured } from '../../lib/env';
import { getMockPerson } from '../../lib/mock/people';
import { avatarUrl, getOwnProfile } from '../../lib/profile/queries';
import { getVerifiedUser } from '../../lib/supabase/server';

export const metadata: Metadata = { title: 'My Profile' };

export default async function MyProfilePage() {
  const configured = isSupabaseConfigured();
  const ctx = configured ? await getVerifiedUser() : null;

  if (ctx) {
    const profile = await getOwnProfile(ctx.supabase, ctx.user.id);
    if (profile) {
      const avatarSrc = await avatarUrl(ctx.supabase, profile.avatarPath);
      return (
        <div className="space-y-6">
          <PageHeader title="My Profile" intro="Only the details marked public are shown to other signed-in members. Your email and phone stay private." />
          <ProfileEditor profile={profile} avatarSrc={avatarSrc} />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" />
        <EmptyState icon="lock" title="Your profile could not be loaded" headingLevel={2}>
          Please refresh the page. If this keeps happening, sign out and back in.
        </EmptyState>
      </div>
    );
  }

  const example = getMockPerson('sample-rohan');
  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" />
      <EmptyState
        icon="lock"
        title="You are not signed in"
        headingLevel={2}
        action={configured ? <ButtonLink href="/login?next=/profile">Sign in</ButtonLink> : undefined}
      >
        {configured
          ? 'Sign in to create and edit your profile. Below is a sample profile showing the layout.'
          : 'Sign-in is not configured in this environment yet. Below is a sample profile showing the layout.'}
      </EmptyState>
      <MockBanner>The profile below belongs to a fictional sample member, not to you.</MockBanner>
      {example ? <ProfileView person={fromMock(example)} headingTag="h2" /> : null}
    </div>
  );
}
