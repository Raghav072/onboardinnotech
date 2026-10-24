import Link from 'next/link';
import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  // Ink text on brand blue is 5.4:1. White on brand blue would be only 3.2:1.
  primary: 'bg-brand-blue text-ink hover:bg-brand-blue-hover',
  secondary: 'border border-ink/25 bg-white text-ink hover:bg-canvas',
};

export function buttonClasses(variant: ButtonVariant = 'primary'): string {
  return `${BASE} ${VARIANTS[variant]}`;
}

export function ButtonLink({
  href,
  variant = 'primary',
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant)}>
      {children}
    </Link>
  );
}

/** A visibly disabled button, for actions whose backend does not exist yet. */
export function DisabledButton({ children, hint }: { children: ReactNode; hint: string }) {
  return (
    <button type="button" disabled title={hint} className={buttonClasses('secondary')}>
      {children}
    </button>
  );
}
