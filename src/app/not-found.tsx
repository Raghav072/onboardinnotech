import { ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export default function NotFound() {
  return (
    <EmptyState icon="search" title="We could not find that page" headingLevel={1} action={<ButtonLink href="/">Back to Home</ButtonLink>}>
      The link may be out of date, or the page may have been removed.
    </EmptyState>
  );
}
