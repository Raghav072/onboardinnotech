import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export function EmptyState({
  icon,
  title,
  children,
  action,
  headingLevel = 3,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** Pick the level that fits the page outline: 1 when the empty state is the whole page. */
  headingLevel?: 1 | 2 | 3;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-ink/25 bg-white px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-blue/15 text-ink">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <Heading className="mt-4 font-display text-lg font-semibold">{title}</Heading>
      {children ? <p className="mt-1 max-w-md text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
