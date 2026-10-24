import type { IconName } from '../components/ui/Icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/** Primary navigation, in the order specified in the brief. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/discover', label: 'Discover People', icon: 'users' },
  { href: '/alumni', label: 'Alumni', icon: 'cap' },
  { href: '/marketplace', label: 'Marketplace', icon: 'bag' },
  { href: '/campus', label: 'Campus Info', icon: 'calendar' },
  { href: '/messages', label: 'Messages', icon: 'message' },
  { href: '/profile', label: 'My Profile', icon: 'user' },
];

/** Items shown directly in the mobile bottom bar; the rest live under "More". */
export const MOBILE_TAB_HREFS: readonly string[] = ['/', '/discover', '/marketplace', '/messages'];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
