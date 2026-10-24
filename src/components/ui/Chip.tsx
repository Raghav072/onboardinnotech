import type { ReactNode } from 'react';

export type ChipTone = 'neutral' | 'selected' | 'promoted' | 'sample' | 'dark';

const TONES: Record<ChipTone, string> = {
  neutral: 'border border-line bg-white text-ink',
  // Yellow highlight + ink border so selection never relies on colour alone.
  selected: 'border border-ink bg-brand-yellow text-ink',
  // Amber label with ink text (about 11:1) marks paid placement.
  promoted: 'border border-ink/20 bg-brand-amber text-ink',
  sample: 'border border-dashed border-ink/40 bg-white text-muted',
  dark: 'bg-ink text-white',
};

export function Chip({ tone = 'neutral', children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function SampleChip() {
  return <Chip tone="sample">Sample</Chip>;
}
