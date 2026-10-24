import type { Metadata } from 'next';
import { DirectoryPage } from '../../components/people/DirectoryPage';

export const metadata: Metadata = { title: 'Alumni' };

export default async function AlumniPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <DirectoryPage
      kind="alumni"
      basePath="/alumni"
      title="Alumni"
      intro="Learn how others built their careers. Filter by company, programme and graduation year, then reach out to alumni who are open to mentoring."
      searchParams={await searchParams}
      sampleBannerText="Everyone and every company shown here is fictional sample data."
      sampleFields={[
        { label: 'Company', kind: 'select', placeholder: 'Any company' },
        { label: 'Programme', kind: 'select', placeholder: 'Any programme' },
        { label: 'Graduation year', kind: 'select', placeholder: 'Any year' },
      ]}
    />
  );
}
