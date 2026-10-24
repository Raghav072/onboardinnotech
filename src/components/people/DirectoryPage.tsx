import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { DirectoryFilters } from './DirectoryFilters';
import { DirectoryResults, ResultsSkeleton } from './DirectoryResults';
import { PersonCard } from './PersonCard';
import { ButtonLink } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { FilterBar } from '../ui/FilterBar';
import type { FilterField } from '../ui/FilterBar';
import { FormMessage } from '../ui/Field';
import { MockBanner } from '../ui/MockBanner';
import { PageHeader } from '../ui/PageHeader';
import { isSupabaseConfigured } from '../../lib/env';
import { directoryHref, parseDirectoryParams } from '../../lib/discovery/params';
import type { DirectoryKind, RawParams } from '../../lib/discovery/params';
import { fromMock } from '../../lib/discovery/person';
import { MOCK_PEOPLE } from '../../lib/mock/people';
import { getVerifiedUser } from '../../lib/supabase/server';

const YEAR_KEY = ['year-1', 'year-2', 'year-3', 'year-4'] as const;

/**
 * Shared page body for Discover People (students) and Alumni.
 *   - Supabase not configured: the Milestone 1 sample layout, unchanged, with filters disabled.
 *   - Configured but signed out: a sign-in prompt (the directory is for signed-in members only).
 *   - Signed in: real results from public.search_public_profiles through the caller's own session.
 */
export async function DirectoryPage({
  kind,
  basePath,
  title,
  intro,
  searchParams,
  sampleFields,
  sampleBannerText,
}: {
  kind: DirectoryKind;
  basePath: string;
  title: string;
  intro: string;
  searchParams: RawParams;
  sampleFields: FilterField[];
  sampleBannerText?: string;
}) {
  const header = <PageHeader title={title} intro={intro} />;
  const ringKey: ReactNode =
    kind === 'student' ? (
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Ring colour key">
        {YEAR_KEY.map((ring, i) => (
          <li key={ring} className="flex items-center gap-2">
            <Avatar name={`Year ${i + 1}`} ring={ring} size="sm" />
            {['1st year', '2nd year', '3rd year', '4th year'][i]}
          </li>
        ))}
      </ul>
    ) : null;

  // 1. Not configured: unchanged sample layout.
  if (!isSupabaseConfigured()) {
    const people = MOCK_PEOPLE.filter((p) => p.kind === kind).map((p) => fromMock(p));
    return (
      <div className="space-y-6">
        {header}
        <MockBanner>{sampleBannerText}</MockBanner>
        <FilterBar activeIn="a project connected to Supabase" fields={sampleFields} />
        {ringKey}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      </div>
    );
  }

  // 2. Configured: the session is verified with the Supabase Auth server, never trusted from a cookie.
  const ctx = await getVerifiedUser();
  if (!ctx) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon="lock"
          title="Sign in to see members"
          headingLevel={2}
          action={<ButtonLink href={`/login?next=${encodeURIComponent(basePath)}`}>Sign in</ButtonLink>}
        >
          The member directory is only visible to signed-in members.
        </EmptyState>
      </div>
    );
  }

  // 3. Signed in: validated request, real data.
  const request = parseDirectoryParams(kind, searchParams);
  return (
    <div className="space-y-6">
      {header}
      <DirectoryFilters kind={kind} basePath={basePath} filters={request.filters} />
      {request.ignored.length > 0 ? <FormMessage>{request.ignored.join(' ')}</FormMessage> : null}
      {ringKey}
      <Suspense key={directoryHref(basePath, request.filters, request.page)} fallback={<ResultsSkeleton />}>
        <DirectoryResults client={ctx.supabase} request={request} basePath={basePath} />
      </Suspense>
    </div>
  );
}
