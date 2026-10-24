import type { Metadata } from 'next';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { MessageInbox } from '../../components/messaging/MessageInbox';
import { isSupabaseConfigured } from '../../lib/env';
import { isUuid } from '../../lib/messaging/validation';
import { getVerifiedUser } from '../../lib/supabase/server';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  if (!isSupabaseConfigured()) {
    return <div className="space-y-6"><PageHeader title="Messages" intro="Private conversations between eligible students and alumni." /><EmptyState icon="lock" title="Messaging is not configured" headingLevel={2}>Configure the Supabase URL and anon key, then apply the reviewed messaging migration to a development database.</EmptyState></div>;
  }
  const ctx = await getVerifiedUser();
  if (!ctx) {
    return <div className="space-y-6"><PageHeader title="Messages" intro="Private conversations between eligible students and alumni." /><EmptyState icon="lock" title="Sign in to view messages" headingLevel={2} action={<ButtonLink href="/login?next=/messages">Sign in</ButtonLink>}>Your conversations are private to your account.</EmptyState></div>;
  }
  const params = await searchParams;
  const targetId = isUuid(params.to) ? params.to : undefined;
  return (
    <div className="space-y-6">
      <PageHeader title="Messages" intro="Direct conversations between eligible students and alumni. Eligibility and blocks are enforced on every send." />
      <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
        <MessageInbox targetId={targetId} />
        <section className="hidden min-h-72 place-items-center rounded-card border border-dashed border-ink/20 bg-white p-6 text-center xl:grid">
          <div className="max-w-sm"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-yellow/60 text-ink"><span aria-hidden="true" className="text-2xl">↗</span></span><h2 className="mt-4 font-display text-xl font-semibold">A more connected campus</h2><p className="mt-2 text-sm text-muted">Choose a conversation to continue, or open an eligible member’s profile to start one.</p></div>
        </section>
      </div>
      <section className="rounded-card border border-line bg-white p-5 sm:p-6" aria-labelledby="messaging-rules">
        <h2 id="messaging-rules" className="font-display text-lg font-semibold">Who can message whom</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>Students in different current years may message.</li>
          <li>Students in the same year cannot message.</li>
          <li>Students can contact alumni who are open to mentoring.</li>
          <li>Alumni can message other alumni.</li>
          <li>Either-direction blocks prevent new messages.</li>
          <li>Unknown or non-current standing blocks student-to-student messaging.</li>
        </ul>
        <p className="mt-4 text-xs text-muted">These rules are checked by the database and rechecked for every message send. Historical conversations remain available to their participants.</p>
      </section>
    </div>
  );
}
