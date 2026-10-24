import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';

export const metadata: Metadata = { title: 'Campus Info' };

export default function CampusPage() {
  const cards = [
    { href: '/campus/events', icon: 'calendar', title: 'Upcoming Events', text: 'Technical fests, workshops, placement and career events, with official registration links.' },
    { href: '/campus/centres', icon: 'cpu', title: 'Centres of Excellence', text: 'Verified information about KIET centres, their facilities and activities.' },
  ] as const;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Info"
        intro="Official information, kept up to date by administrators. Every entry will show its source link, status and the date it was last verified."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="flex gap-4 rounded-card border border-line bg-white p-6 shadow-soft transition-colors hover:border-ink/40">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-blue/20">
              <Icon name={c.icon} className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-display text-xl font-semibold">{c.title}</span>
              <span className="mt-1 block text-muted">{c.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
