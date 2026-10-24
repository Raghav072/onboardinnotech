import type { ReactNode } from 'react';

export function PageHeader({ title, intro, children }: { title: string; intro?: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {intro ? <p className="mt-2 max-w-prose text-muted">{intro}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}

export function SectionHeading({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 id={id} className="font-display text-xl font-semibold md:text-2xl">
        {title}
      </h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
