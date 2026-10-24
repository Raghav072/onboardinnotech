import type { Metadata } from 'next';
import { CentresEmpty } from '../../../components/ui/CampusEmpty';
import { FilterBar } from '../../../components/ui/FilterBar';
import { PageHeader } from '../../../components/ui/PageHeader';

export const metadata: Metadata = { title: 'Centres of Excellence' };

export default function CentresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Centres of Excellence"
        intro="Centres will be listed only with names and details confirmed from official KIET sources. Anything unconfirmed is marked for administrator review, never guessed."
      />
      <FilterBar
        activeIn="Milestone 6"
        fields={[
          { label: 'Search', kind: 'search', placeholder: 'Centre name' },
          { label: 'Domain', kind: 'select', placeholder: 'All domains' },
        ]}
      />
      <CentresEmpty headingLevel={2} />
    </div>
  );
}
