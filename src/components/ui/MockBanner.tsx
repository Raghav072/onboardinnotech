import { Icon } from './Icon';

/** Shown on every page that renders sample data, so nothing is mistaken for real content. */
export function MockBanner({ children }: { children?: string }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-tile border border-ink/20 bg-brand-yellow/60 px-4 py-3 text-sm">
      <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
      <p>
        <strong className="font-semibold">Layout preview.</strong>{' '}
        {children ?? 'Everything on this page is sample data. Nothing is saved, sent or connected to a database yet.'}
      </p>
    </div>
  );
}
