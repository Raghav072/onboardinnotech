'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { PRIMARY_NAV, isActivePath } from '../../lib/nav';

/** Sidebar navigation: full labels on lg+, icon rail on md. Hidden below md (bottom bar is used). */
export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-20 shrink-0 flex-col justify-between border-r border-line bg-white px-3 py-5 md:flex lg:w-64 lg:px-4">
      <nav aria-label="Primary">
        <ul className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className={`flex min-h-11 items-center gap-3 rounded-full px-3 text-sm transition-colors lg:px-4 ${
                    active ? 'bg-brand-blue font-semibold text-ink' : 'text-ink hover:bg-brand-blue/15'
                  }`}
                >
                  <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="hidden text-xs text-muted lg:block">
        <p className="font-semibold text-ink">Made for campus life</p>
        <p className="mt-1">A university-focused space to connect, discover and find what you need.</p>
      </div>
    </aside>
  );
}
