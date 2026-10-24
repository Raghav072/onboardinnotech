import type { ReactNode } from 'react';

export const inputClasses =
  'min-h-11 w-full rounded-tile border border-ink/25 bg-white px-3 text-base placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-text';

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="border-l-4 border-brand-pink pl-2 text-sm font-semibold text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <p role={ok ? 'status' : 'alert'} className={`rounded-tile border px-3 py-2 text-sm ${ok ? 'border-ink/20 bg-brand-blue/10' : 'border-brand-pink/40 bg-white font-medium'}`}>
      {children}
    </p>
  );
}
