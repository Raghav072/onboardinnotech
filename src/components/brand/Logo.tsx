/**
 * ONBOARD logo as inline SVG so it can be themed. Geometry must stay in sync with
 * public/logo-*.svg (the standalone files used for favicons and sharing).
 */
const INK = '#0B1B33';

export function LogoMark({ size = 40, variant = 'light' }: { size?: number; variant?: 'light' | 'dark' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="18" fill="#2391FF" />
      <circle cx="32" cy="32" r="14" fill="none" stroke="#FFFFFF" strokeWidth="5" />
      <circle cx="32" cy="32" r="3.5" fill="#FFFFFF" />
      <circle cx="32" cy="18" r="6" fill="#FFF83F" stroke="#2391FF" strokeWidth="2.5" />
      <circle cx="44.1" cy="39" r="6" fill="#F70063" stroke="#2391FF" strokeWidth="2.5" />
      <circle cx="19.9" cy="39" r="6" fill="#FFCD54" stroke="#2391FF" strokeWidth="2.5" />
      {variant === 'dark' && (
        <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="17.25" fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1.5" />
      )}
    </svg>
  );
}

export function Wordmark({ height = 22, variant = 'light' }: { height?: number; variant?: 'light' | 'dark' }) {
  const colour = variant === 'light' ? INK : '#FFFFFF';
  return (
    <svg height={height} viewBox="-4 4 168 32" aria-hidden="true" focusable="false">
      <g fill="none" stroke={colour} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="8" cy="20" rx="8" ry="10" />
        <path d="M25 30V10L41 30V10" />
        <path d="M50 10V30M50 10H58A5 5 0 0 1 58 20H50M50 20H59A5 5 0 0 1 59 30H50" />
        <ellipse cx="80" cy="20" rx="8" ry="10" />
        <path d="M94 30L102 10L110 30M97 23H107" />
        <path d="M119 30V10H127A5 5 0 0 1 127 20H119M126 20L133 30" />
        <path d="M142 10V30H149A9 10 0 0 0 149 10Z" />
      </g>
    </svg>
  );
}

/** Icon + wordmark. `hideWordmarkOnSmall` shows only the icon on narrow screens. */
export function Logo({
  variant = 'light',
  hideWordmarkOnSmall = false,
}: {
  variant?: 'light' | 'dark';
  hideWordmarkOnSmall?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={36} variant={variant} />
      <span className={hideWordmarkOnSmall ? 'hidden sm:inline-flex' : 'inline-flex'}>
        <Wordmark height={20} variant={variant} />
      </span>
      <span className="sr-only">ONBOARD</span>
    </span>
  );
}
