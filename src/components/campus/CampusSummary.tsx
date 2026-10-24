import Link from 'next/link';
import { CentresEmpty, EventsEmpty } from '../ui/CampusEmpty';
import { SectionHeading } from '../ui/PageHeader';

export function CampusSummary() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="home-events">
        <SectionHeading id="home-events" title="Upcoming events" />
        <EventsEmpty />
        <p className="mt-3 text-sm">
          <Link href="/campus/events" className="font-medium text-brand-blue-text underline underline-offset-2">
            Go to events
          </Link>
        </p>
      </section>
      <section aria-labelledby="home-centres">
        <SectionHeading id="home-centres" title="Centres of Excellence" />
        <CentresEmpty />
        <p className="mt-3 text-sm">
          <Link href="/campus/centres" className="font-medium text-brand-blue-text underline underline-offset-2">
            Go to centres
          </Link>
        </p>
      </section>
    </div>
  );
}
