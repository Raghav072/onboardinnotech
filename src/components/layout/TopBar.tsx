import Link from 'next/link';
import { Logo } from '../brand/Logo';
import { Icon } from '../ui/Icon';
import { AuthButton } from './AuthButton';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1400px] items-center gap-3 px-4 md:gap-6 md:px-6">
        <Link href="/" aria-label="ONBOARD home" className="shrink-0">
          <Logo hideWordmarkOnSmall />
        </Link>
        <form role="search" action="/discover" method="get" className="relative min-w-0 flex-1 md:max-w-xl">
          <label htmlFor="global-search" className="sr-only">
            Search students and alumni
          </label>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" className="h-5 w-5" />
          </span>
          <input
            id="global-search"
            name="q"
            type="search"
            placeholder="Search students and alumni"
            className="min-h-11 w-full rounded-full border border-line bg-canvas pl-10 pr-4 text-sm placeholder:text-muted focus:border-brand-blue focus:bg-white"
          />
        </form>
        <AuthButton />
      </div>
    </header>
  );
}
