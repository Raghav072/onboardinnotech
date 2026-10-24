import Link from 'next/link';
import { PersonCard } from './PersonCard';
import { buttonClasses } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Pagination } from '../ui/Pagination';
import { directoryHref, hasActiveFilters, PAGE_SIZE } from '../../lib/discovery/params';
import type { ParsedDirectoryRequest } from '../../lib/discovery/params';
import { fromPublicProfile } from '../../lib/discovery/person';
import { searchDirectory } from '../../lib/discovery/queries';
import type { RpcClient } from '../../lib/discovery/queries';

/** Loading state shown while the directory query runs (used as a Suspense fallback). */
export function ResultsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-4">
      <span className="sr-only">Loading members</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-card bg-line" />
        ))}
      </div>
    </div>
  );
}

/** Runs the search on the server and renders results, or an honest empty / error state. */
export async function DirectoryResults({ client, request, basePath }: { client: RpcClient; request: ParsedDirectoryRequest; basePath: string }) {
  const outcome = await searchDirectory(client, request);
  const noun = request.kind === 'student' ? 'students' : 'alumni';

  if (!outcome.ok) {
    return (
      <EmptyState
        icon="alert"
        title="Members could not be loaded"
        action={<Link href={directoryHref(basePath, request.filters, request.page)} className={buttonClasses('primary')}>Try again</Link>}
      >
        Something went wrong while searching. Nothing was changed. Try again in a moment.
      </EmptyState>
    );
  }

  if (outcome.outOfRange) {
    return (
      <EmptyState icon="search" title="No more results" action={<Link href={directoryHref(basePath, request.filters, 1)} className={buttonClasses('primary')}>Back to the first page</Link>}>
        There are no {noun} on that page.
      </EmptyState>
    );
  }

  if (outcome.entries.length === 0) {
    return hasActiveFilters(request.filters) ? (
      <EmptyState icon="search" title={`No ${noun} match your search`} action={<Link href={basePath} className={buttonClasses('primary')}>Clear filters</Link>}>
        Try a shorter name, a different programme or fewer filters.
      </EmptyState>
    ) : (
      <EmptyState icon="users" title={`No ${noun} to show yet`}>
        Members appear here once they have completed their profile and chosen to make it visible to other signed-in members.
      </EmptyState>
    );
  }

  const from = (outcome.page - 1) * PAGE_SIZE + 1;
  const to = from + outcome.entries.length - 1;
  const now = new Date();
  return (
    <div className="space-y-5">
      <p aria-live="polite" className="text-sm text-muted">
        Showing {from} to {to} of {outcome.total} {noun}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {outcome.entries.map((e) => (
          <li key={e.id} className="flex [&>article]:w-full">
            <PersonCard person={fromPublicProfile(e, now)} />
          </li>
        ))}
      </ul>
      <Pagination page={outcome.page} pageCount={outcome.pageCount} hrefFor={(n) => directoryHref(basePath, request.filters, n)} />
    </div>
  );
}
