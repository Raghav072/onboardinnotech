'use client';

import { buttonClasses } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The error object is intentionally not rendered: internal details must not leak to users.
  return (
    <EmptyState
      icon="alert"
      title="Something went wrong"
      headingLevel={1}
      action={
        <button type="button" onClick={reset} className={buttonClasses('primary')}>
          Try again
        </button>
      }
    >
      This page could not be shown. Try again, and if it keeps happening, come back in a little while.
    </EmptyState>
  );
}
