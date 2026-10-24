'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { Icon } from '../ui/Icon';
import { MOBILE_TAB_HREFS, PRIMARY_NAV, isActivePath } from '../../lib/nav';

const TAB_ITEMS = PRIMARY_NAV.filter((i) => MOBILE_TAB_HREFS.includes(i.href));

/** Bottom tab bar (below md) with a "More" sheet holding every destination. */
export function MobileNav() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Close the sheet whenever the route changes.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  return (
    <>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {TAB_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${active ? 'font-bold' : 'text-muted'}`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? 'bg-brand-blue text-ink' : ''}`}>
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  {item.label === 'Discover People' ? 'Discover' : item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs text-muted"
            >
              <span className="grid h-7 w-12 place-items-center rounded-full">
                <Icon name="menu" className="h-5 w-5" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={dialogRef}
        aria-labelledby="more-title"
        onClick={(e: MouseEvent<HTMLDialogElement>) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-0 mt-auto w-full max-w-none rounded-t-card bg-white p-0 backdrop:bg-ink/50"
      >
        <div className="p-5 pb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="more-title" className="font-display text-xl font-semibold">
              All sections
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="grid h-11 w-11 place-items-center rounded-full hover:bg-canvas"
              aria-label="Close menu"
            >
              <Icon name="x" />
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-base ${active ? 'bg-brand-blue font-semibold text-ink' : 'hover:bg-canvas'}`}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-muted">Account settings and log out arrive with authentication in Milestone 2.</p>
        </div>
      </dialog>
    </>
  );
}
