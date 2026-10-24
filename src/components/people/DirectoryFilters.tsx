import Link from 'next/link';
import { buttonClasses } from '../ui/Button';
import { hasActiveFilters, MAX_TEXT_LENGTH } from '../../lib/discovery/params';
import type { DirectoryFilters as Filters, DirectoryKind } from '../../lib/discovery/params';

const control = 'min-h-11 rounded-tile border border-ink/25 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-text';
const label = 'flex flex-col gap-1 text-sm font-medium';

/**
 * Real filters for the member directories. A plain GET form: no client JavaScript, so the
 * URL is the single source of truth and every result page is linkable. Values are
 * re-validated on the server by parseDirectoryParams; nothing here is trusted.
 */
export function DirectoryFilters({ kind, basePath, filters }: { kind: DirectoryKind; basePath: string; filters: Filters }) {
  return (
    <form method="get" action={basePath} role="search" aria-label={kind === 'student' ? 'Search students' : 'Search alumni'} className="mb-6 rounded-card border border-line bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>
          Name
          <input type="search" name="q" defaultValue={filters.q ?? ''} maxLength={MAX_TEXT_LENGTH} placeholder="Search by name" className={control} />
        </label>
        <label className={label}>
          Programme
          <input type="search" name="programme" defaultValue={filters.programme ?? ''} maxLength={MAX_TEXT_LENGTH} placeholder={kind === 'student' ? 'e.g. B.Tech CSE' : 'Any programme'} className={control} />
        </label>
        <label className={label}>
          Skills
          <input type="search" name="skill" defaultValue={filters.skill ?? ''} maxLength={MAX_TEXT_LENGTH} placeholder="e.g. Python" className={control} />
        </label>
        {kind === 'student' ? (
          <label className={label}>
            Year
            <select name="year" defaultValue={filters.yearOfStudy ? String(filters.yearOfStudy) : ''} className={control}>
              <option value="">All years</option>
              <option value="1">1st year</option>
              <option value="2">2nd year</option>
              <option value="3">3rd year</option>
              <option value="4">4th year</option>
            </select>
          </label>
        ) : (
          <>
            <label className={label}>
              Company
              <input type="search" name="company" defaultValue={filters.company ?? ''} maxLength={MAX_TEXT_LENGTH} placeholder="Any company" className={control} />
            </label>
            <label className={label}>
              Graduation year
              <input type="number" name="grad" inputMode="numeric" min={2000} max={2100} defaultValue={filters.graduationYear ?? ''} placeholder="e.g. 2024" className={control} />
            </label>
            <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium">
              <input type="checkbox" name="mentoring" value="1" defaultChecked={filters.mentoring} className="h-5 w-5" />
              Open to mentoring
            </label>
          </>
        )}
        <label className={label}>
          Sort by
          <select name="sort" defaultValue={filters.sort} className={control}>
            <option value="name">Name (A to Z)</option>
            <option value="name_desc">Name (Z to A)</option>
            <option value="newest">{kind === 'student' ? 'Newest students first' : 'Most recent graduates first'}</option>
            <option value="oldest">{kind === 'student' ? 'Oldest students first' : 'Earliest graduates first'}</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" className={buttonClasses('primary')}>
          Search
        </button>
        {hasActiveFilters(filters) || filters.sort !== 'name' ? (
          <Link href={basePath} className={buttonClasses('secondary')}>
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}
