import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '../../../components/people/Avatar';
import { DisabledButton } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { MockBanner } from '../../../components/ui/MockBanner';
import { ringKeyForStanding } from '../../../lib/academic-year';
import { MOCK_LISTINGS, formatPrice, getMockListing } from '../../../lib/mock/listings';
import { getMockPerson, standingFor } from '../../../lib/mock/people';

export const dynamicParams = false;

export function generateStaticParams() {
  return MOCK_LISTINGS.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = getMockListing(id);
  return { title: listing ? listing.title : 'Listing' };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = getMockListing(id);
  if (!listing) notFound();
  const seller = getMockPerson(listing.sellerId);
  const unavailable = listing.status === 'sold' || listing.status === 'unavailable';

  return (
    <div className="space-y-6">
      <p className="text-sm">
        <Link href="/marketplace" className="font-medium text-brand-blue-text underline underline-offset-2">
          All listings
        </Link>
      </p>
      <MockBanner>This listing is fictional sample data.</MockBanner>
      <article className="grid gap-8 lg:grid-cols-2" aria-labelledby="listing-title">
        <div className="grid aspect-[4/3] place-items-center rounded-card bg-brand-blue/20">
          <Icon name="box" className="h-20 w-20 text-ink/70" />
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Chip tone="dark">{listing.transaction === 'sale' ? 'For sale' : listing.transaction === 'rent' ? 'For rent' : 'Free giveaway'}</Chip>
            {listing.promoted ? <Chip tone="promoted">Promoted</Chip> : null}
            <Chip tone={listing.status === 'available' ? 'neutral' : 'dark'}>
              {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
            </Chip>
          </div>
          <h1 id="listing-title" className="font-display text-3xl font-bold tracking-tight">
            {listing.title}
          </h1>
          <p className="text-2xl font-bold">{formatPrice(listing)}</p>
          <p className="max-w-prose">{listing.description}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Category</dt>
              <dd className="font-medium">{listing.category}, {listing.subcategory}</dd>
            </div>
            <div>
              <dt className="text-muted">Condition</dt>
              <dd className="font-medium">{listing.condition}</dd>
            </div>
          </dl>
          {seller ? (
            <Link href={`/people/${seller.id}`} className="flex items-center gap-3 rounded-tile border border-line bg-white p-3">
              <Avatar name={seller.name} ring={ringKeyForStanding(standingFor(seller))} size="md" />
              <span>
                <span className="block font-semibold">{seller.name}</span>
                <span className="text-sm text-muted">{seller.programme}</span>
              </span>
            </Link>
          ) : null}
          <div>
            <DisabledButton hint="Messaging arrives in Milestone 5">
              <Icon name="message" className="h-4 w-4" />
              {unavailable ? 'No longer available' : 'Message seller'}
            </DisabledButton>
            <p className="mt-2 max-w-md text-xs text-muted">
              Messaging is not connected yet. Once it is, the server will apply the academic-year rules, so same-year students will not be able to message each other.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
