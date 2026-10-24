import type { RingKey } from './academic-year';

/** The four ONBOARD brand colours. Exact values from the brief. */
export const BRAND = {
  blue: '#2391FF',
  yellow: '#FFF83F',
  amber: '#FFCD54',
  pink: '#F70063',
} as const;

/** Neutrals for readability. The brand colours above stay the recognisable identity. */
export const NEUTRALS = {
  ink: '#0B1B33',
  muted: '#53637A',
  line: '#DCE4F0',
  canvas: '#F4F8FE',
  surface: '#FFFFFF',
  /** Darker brand-blue shade for text on white (brand blue is 3.2:1 on white). */
  blueText: '#0A5CB8',
  /** Lighter hover state for blue buttons (keeps ink text above 4.5:1). */
  blueHover: '#4DA8FF',
} as const;

/** Academic-year profile rings. Separate from the brand palette. */
export const YEAR_RING_COLORS = {
  1: '#1E3A8A', // dark blue
  2: '#F2C600', // yellow
  3: '#7C3AED', // purple
  4: '#16A34A', // green
} as const;

export const ALUMNI_RING_COLOR = NEUTRALS.ink;

export const RING_COLORS: Record<RingKey, string> = {
  'year-1': YEAR_RING_COLORS[1],
  'year-2': YEAR_RING_COLORS[2],
  'year-3': YEAR_RING_COLORS[3],
  'year-4': YEAR_RING_COLORS[4],
  alumni: ALUMNI_RING_COLOR,
  none: NEUTRALS.line,
};
