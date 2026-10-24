import type { Metadata } from 'next';
import { ListingCard } from '../../components/market/ListingCard';
import { DisabledButton } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { FilterBar } from '../../components/ui/FilterBar';
import { MockBanner } from '../../components/ui/MockBanner';
import { PageHeader } from '../../components/ui/PageHeader';
import { MOCK_LISTINGS } from '../../lib/mock/listings';

export const metadata: Metadata = { title: 'Marketplace' };

const CATEGORY_PREVIEW = ['Academic Essentials', 'Hostel Essentials', 'Electronics', 'Transport'];

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        intro="Buy, sell, rent or give away the things campus life runs on. ONBOARD connects buyers and sellers; payments are not collected here."
      >
        <DisabledButton hint="Creating listings needs an account (Milestone 2) and the marketplace (Milestone 4)">
          Create a listing
        </DisabledButton>
      </PageHeader>
      <MockBanner>Listings, prices and sellers are fictional. Photos are placeholders.</MockBanner>
      <FilterBar
        activeIn="Milestone 4"
        fields={[
          { label: 'Search', kind: 'search', placeholder: 'Title or description' },
          { label: 'Category', kind: 'select', placeholder: 'All categories' },
          { label: 'Buy or rent', kind: 'select', placeholder: 'Buy and rent' },
          { label: 'Sort by', kind: 'select', placeholder: 'Newest' },
        ]}
      />
      <ul className="flex flex-wrap gap-2" aria-label="Top-level categories (preview)">
        {CATEGORY_PREVIEW.map((c) => (
          <li key={c}>
            <Chip>{c}</Chip>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_LISTINGS.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}
