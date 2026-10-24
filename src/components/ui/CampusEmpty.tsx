import { EmptyState } from './EmptyState';

/** Events and Centres are administrator-managed. Until entries are verified, show honest empty states. */
export function EventsEmpty({ headingLevel = 3 }: { headingLevel?: 1 | 2 | 3 }) {
  return (
    <EmptyState icon="calendar" title="No verified events yet" headingLevel={headingLevel}>
      Events appear here once an administrator adds them with an official source link and a verification date. Nothing is shown until then.
    </EmptyState>
  );
}

export function CentresEmpty({ headingLevel = 3 }: { headingLevel?: 1 | 2 | 3 }) {
  return (
    <EmptyState icon="cpu" title="No verified Centres of Excellence yet" headingLevel={headingLevel}>
      Each centre will be listed with its official name, source link and last-verified date after an administrator confirms it.
    </EmptyState>
  );
}
