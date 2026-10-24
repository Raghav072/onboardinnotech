import type { Metadata } from 'next';
import { DirectoryPage } from '../../components/people/DirectoryPage';

export const metadata: Metadata = { title: 'Discover People' };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <DirectoryPage
      kind="student"
      basePath="/discover"
      title="Discover People"
      intro="Find students across programmes and years, and see what they are working on."
      searchParams={await searchParams}
      sampleFields={[
        { label: 'Name', kind: 'search', placeholder: 'Search by name' },
        { label: 'Programme', kind: 'select', placeholder: 'All programmes' },
        { label: 'Year', kind: 'select', placeholder: 'All years' },
        { label: 'Skills', kind: 'search', placeholder: 'e.g. Python' },
      ]}
    />
  );
}
