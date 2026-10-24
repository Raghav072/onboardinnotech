/**
 * SAMPLE DATA ONLY. These listings are fictional layout examples. Nothing here is
 * real, stored, or purchasable.
 */
export type Transaction = 'sale' | 'rent' | 'giveaway';
export type ListingStatus = 'available' | 'reserved' | 'sold' | 'unavailable';
export type Condition = 'New' | 'Like new' | 'Good' | 'Fair';
export type Tint = 'blue' | 'amber' | 'yellow' | 'pink';

export interface MockListing {
  id: string;
  title: string;
  description: string;
  transaction: Transaction;
  /** Rupees. null for giveaways. */
  price: number | null;
  rentPeriod?: 'week' | 'month';
  category: string;
  subcategory: string;
  condition: Condition;
  status: ListingStatus;
  promoted: boolean;
  sellerId: string;
  tint: Tint;
  isMock: true;
}

export const MOCK_LISTINGS: readonly MockListing[] = [
  { id: 'sample-calculator', title: 'Scientific calculator', description: 'Works well, fresh batteries. Handy for exams and labs.',
    transaction: 'sale', price: 650, category: 'Academic Essentials', subcategory: 'Calculators',
    condition: 'Good', status: 'available', promoted: false, sellerId: 'sample-rohan', tint: 'blue', isMock: true },
  { id: 'sample-kettle', title: 'Electric kettle, 1.5 L', description: 'Used for one semester. Auto switch-off works.',
    transaction: 'sale', price: 400, category: 'Hostel Essentials', subcategory: 'Kitchen Appliances',
    condition: 'Like new', status: 'reserved', promoted: false, sellerId: 'sample-kabir', tint: 'amber', isMock: true },
  { id: 'sample-bicycle', title: 'City bicycle for rent', description: 'Sturdy bicycle with a basket. Helmet included.',
    transaction: 'rent', price: 300, rentPeriod: 'month', category: 'Transport', subcategory: 'Bicycles',
    condition: 'Good', status: 'available', promoted: true, sellerId: 'sample-dev', tint: 'pink', isMock: true },
  { id: 'sample-drawing-kit', title: 'Engineering drawing kit', description: 'Drafter, set squares and compass in a hard case.',
    transaction: 'sale', price: 250, category: 'Academic Essentials', subcategory: 'Drawing Equipment',
    condition: 'Fair', status: 'sold', promoted: false, sellerId: 'sample-tanvi', tint: 'yellow', isMock: true },
  { id: 'sample-keyboard', title: 'Mechanical keyboard', description: 'Compact layout, blue switches, USB-C cable.',
    transaction: 'sale', price: 1800, category: 'Electronics', subcategory: 'Computer Accessories',
    condition: 'Good', status: 'available', promoted: false, sellerId: 'sample-sana', tint: 'blue', isMock: true },
  { id: 'sample-lamp', title: 'Study lamp', description: 'Clip-on lamp, two brightness levels. Free to a good home.',
    transaction: 'giveaway', price: null, category: 'Hostel Essentials', subcategory: 'Lighting',
    condition: 'Good', status: 'available', promoted: false, sellerId: 'sample-meera', tint: 'amber', isMock: true },
];

export function getMockListing(id: string): MockListing | undefined {
  return MOCK_LISTINGS.find((l) => l.id === id);
}

export function formatPrice(listing: MockListing): string {
  if (listing.transaction === 'giveaway' || listing.price === null) return 'Free';
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(listing.price);
  return listing.transaction === 'rent' && listing.rentPeriod ? `${amount} / ${listing.rentPeriod}` : amount;
}
