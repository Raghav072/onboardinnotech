import type { Metadata } from 'next';
import { Chip } from '../../../components/ui/Chip';
import { EventsEmpty } from '../../../components/ui/CampusEmpty';
import { FilterBar } from '../../../components/ui/FilterBar';
import { PageHeader } from '../../../components/ui/PageHeader';

export const metadata: Metadata = { title: 'Upcoming Events' };

const STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Postponed', 'Cancelled'];

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Upcoming Events"
        intro="Events listed here will come from official KIET sources and carry a verification date. No events are listed until an administrator adds and verifies them."
      />
      <FilterBar
        activeIn="Milestone 6"
        fields={[
          { label: 'Search', kind: 'search', placeholder: 'Event title' },
          { label: 'Category', kind: 'select', placeholder: 'All categories' },
          { label: 'Sort by', kind: 'select', placeholder: 'Date' },
        ]}
      />
      <EventsEmpty headingLevel={2} />
      <section aria-labelledby="statuses">
        <h2 id="statuses" className="mb-2 text-sm font-semibold">
          Statuses events can show
        </h2>
        <ul className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <li key={s}>
              <Chip>{s}</Chip>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
