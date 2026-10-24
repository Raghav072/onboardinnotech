import Link from 'next/link';
import { buttonClasses } from './Button';

/** Previous / Next links. Plain links, so paging works without JavaScript and is shareable. */
export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const disabled = `${buttonClasses('secondary')} pointer-events-none opacity-60`;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={buttonClasses('secondary')}>
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={disabled}>Previous</span>
      )}
      <p className="text-sm text-muted">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" className={buttonClasses('secondary')}>
          Next
        </Link>
      ) : (
        <span aria-disabled="true" className={disabled}>Next</span>
      )}
    </nav>
  );
}
