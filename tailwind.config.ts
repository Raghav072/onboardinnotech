import type { Config } from 'tailwindcss';
import { BRAND, NEUTRALS, YEAR_RING_COLORS, ALUMNI_RING_COLOR } from './src/lib/brand';

/**
 * Design tokens. Colour values live in src/lib/brand.ts (single source of truth,
 * also used by tests and the /design-system page).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: BRAND.blue,
          yellow: BRAND.yellow,
          amber: BRAND.amber,
          pink: BRAND.pink,
          // Darker shade of brand blue for TEXT on white. #2391FF itself is
          // only 3.2:1 on white, below the 4.5:1 AA threshold for body text.
          'blue-text': NEUTRALS.blueText,
          'blue-hover': NEUTRALS.blueHover,
        },
        ink: NEUTRALS.ink,
        muted: NEUTRALS.muted,
        line: NEUTRALS.line,
        canvas: NEUTRALS.canvas,
        year: {
          1: YEAR_RING_COLORS[1],
          2: YEAR_RING_COLORS[2],
          3: YEAR_RING_COLORS[3],
          4: YEAR_RING_COLORS[4],
          alumni: ALUMNI_RING_COLOR,
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        tile: '1rem',
        card: '1.25rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11, 27, 51, 0.06), 0 10px 28px -14px rgba(11, 27, 51, 0.22)',
      },
    },
  },
  plugins: [],
};

export default config;
