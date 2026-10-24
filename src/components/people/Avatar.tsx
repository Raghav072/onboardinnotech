import { RING_COLORS } from '../../lib/brand';
import type { RingKey } from '../../lib/academic-year';
import { Icon } from '../ui/Icon';

const SIZES = {
  sm: { box: 36, ring: 2, text: 'text-xs' },
  md: { box: 48, ring: 3, text: 'text-sm' },
  lg: { box: 68, ring: 3, text: 'text-lg' },
  xl: { box: 104, ring: 4, text: 'text-3xl' },
} as const;

const TINTS = ['bg-brand-blue/25', 'bg-brand-amber/50', 'bg-brand-yellow/70'] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function tintFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length] ?? TINTS[0];
}

export function ringLabel(ring: RingKey): string {
  switch (ring) {
    case 'year-1': return '1st year student';
    case 'year-2': return '2nd year student';
    case 'year-3': return '3rd year student';
    case 'year-4': return '4th year student';
    case 'alumni': return 'Alumni';
    default: return 'Member';
  }
}

/**
 * Profile photo placeholder with the academic-year ring. The ring colour comes
 * from the `ring` prop, which must be derived from trusted data (see
 * lib/academic-year.ts), never from user input.
 */
export function Avatar({ name, ring, size = 'md' }: { name: string; ring: RingKey; size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <span className="relative inline-block shrink-0" style={{ width: s.box, height: s.box }}>
      <span
        role="img"
        aria-label={`${name}, ${ringLabel(ring)}`}
        className="grid h-full w-full place-items-center rounded-full bg-white"
        style={{
          border: `${s.ring}px ${ring === 'alumni' ? 'dashed' : 'solid'} ${RING_COLORS[ring]}`,
          padding: 2,
        }}
      >
        <span className={`grid h-full w-full place-items-center rounded-full font-display font-semibold ${s.text} ${tintFor(name)}`}>
          {initials(name)}
        </span>
      </span>
      {ring === 'alumni' && (
        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-white">
          <Icon name="cap" className="h-3 w-3" />
        </span>
      )}
    </span>
  );
}
