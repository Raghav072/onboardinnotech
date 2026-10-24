import Link from 'next/link';
import { Avatar } from '../people/Avatar';
import { Chip, SampleChip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { ringKeyForStanding } from '../../lib/academic-year';
import { formatPrice } from '../../lib/mock/listings';
import type { MockListing, Tint } from '../../lib/mock/listings';
import { getMockPerson, standingFor } from '../../lib/mock/people';

const TINT_CLASSES: Record<Tint, string> = {
  blue: 'bg-brand-blue/20',
  amber: 'bg-brand-amber/45',
  yellow: 'bg-brand-yellow/60',
  pink: 'bg-brand-pink/15',
};

const TRANSACTION_LABEL = { sale: 'For sale', rent: 'For rent', giveaway: 'Free giveaway' } as const;
const STATUS_LABEL = { available: 'Available', reserved: 'Reserved', sold: 'Sold', unavailable: 'Unavailable' } as const;

export function ListingCard({ listing }: { listing: MockListing }) {
  const seller = getMockPerson(listing.sellerId);
  const sellerRing = seller ? ringKeyForStanding(standingFor(seller)) : 'none';
  const dimmed = listing.status === 'sold' || listing.status === 'unavailable';
  return (
    <article className={`relative flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-soft ${dimmed ? 'opacity-75' : ''}`}>
      <div className={`relative grid aspect-[4/3] place-items-center ${TINT_CLASSES[listing.tint]}`}>
        <Icon name="box" className="h-12 w-12 text-ink/70" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Chip tone="dark">{TRANSACTION_LABEL[listing.transaction]}</Chip>
          {listing.promoted ? <Chip tone="promoted">Promoted</Chip> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-lg font-semibold leading-snug">
          <Link href={`/marketplace/${listing.id}`} className="after:absolute after:inset-0">
            {listing.title}
          </Link>
        </h3>
        <p className="text-lg font-bold">{formatPrice(listing)}</p>
        <p className="text-sm text-muted">
          {listing.subcategory}, {listing.condition}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <Chip tone={listing.status === 'available' ? 'neutral' : 'dark'}>{STATUS_LABEL[listing.status]}</Chip>
          <SampleChip />
          {seller ? (
            <span className="ml-auto">
              <Avatar name={seller.name} ring={sellerRing} size="sm" />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
