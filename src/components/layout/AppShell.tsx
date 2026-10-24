import type { ReactNode } from 'react';
import Link from 'next/link';
import { TopBar } from './TopBar';
import { SideNav } from './NavList';
import { MobileNav } from './MobileNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <TopBar />
      <div className="mx-auto flex max-w-[1400px]">
        <SideNav />
        <div className="min-w-0 flex-1">
          <main id="main" tabIndex={-1} className="px-4 pb-28 pt-6 outline-none md:px-8 md:pb-12 md:pt-8">
            {children}
          </main>
          <footer className="border-t border-line px-4 py-6 text-sm text-muted md:px-8">
            <p>
              ONBOARD, starting with KIET Group of Institutions, Ghaziabad. This is a development preview.{' '}
              <Link href="/design-system" className="font-medium text-brand-blue-text underline underline-offset-2">
                Design system
              </Link>
            </p>
          </footer>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
