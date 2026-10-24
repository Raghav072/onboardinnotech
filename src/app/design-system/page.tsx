import type { Metadata } from 'next';
import { Logo, LogoMark } from '../../components/brand/Logo';
import { Avatar } from '../../components/people/Avatar';
import { ButtonLink, DisabledButton } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { PageHeader, SectionHeading } from '../../components/ui/PageHeader';
import { BRAND, NEUTRALS, YEAR_RING_COLORS } from '../../lib/brand';
import { contrastRatio } from '../../lib/contrast';

export const metadata: Metadata = { title: 'Design system' };

const SWATCHES = [
  { name: 'Blue', hex: BRAND.blue, usage: 'Primary buttons, active navigation, links' },
  { name: 'Yellow', hex: BRAND.yellow, usage: 'Highlights, selected chips, attention banners' },
  { name: 'Amber', hex: BRAND.amber, usage: 'Marketplace highlights, Promoted labels' },
  { name: 'Pink', hex: BRAND.pink, usage: 'High-impact accents, notification dots' },
] as const;

const PAIRS = [
  { label: 'Ink text on white', fg: NEUTRALS.ink, bg: '#FFFFFF' },
  { label: 'Ink text on brand blue (buttons)', fg: NEUTRALS.ink, bg: BRAND.blue },
  { label: 'Ink text on brand amber (Promoted)', fg: NEUTRALS.ink, bg: BRAND.amber },
  { label: 'Ink text on brand yellow (selected)', fg: NEUTRALS.ink, bg: BRAND.yellow },
  { label: 'Blue link text on white', fg: NEUTRALS.blueText, bg: '#FFFFFF' },
  { label: 'Muted text on white', fg: NEUTRALS.muted, bg: '#FFFFFF' },
  { label: 'Brand blue itself as text on white (not used for text)', fg: BRAND.blue, bg: '#FFFFFF' },
  { label: 'White text on brand pink (not used for text)', fg: '#FFFFFF', bg: BRAND.pink },
] as const;

export default function DesignSystemPage() {
  return (
    <div className="space-y-12">
      <PageHeader title="Design system" intro="Reference for the ONBOARD brand: palette, logo, rings and core components. Development preview only." />

      <section aria-labelledby="palette">
        <SectionHeading id="palette" title="Brand palette" hint="Four colours. Neutrals support readability." />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SWATCHES.map((s) => (
            <li key={s.name} className="overflow-hidden rounded-card border border-line bg-white">
              <div className="h-24" style={{ backgroundColor: s.hex }} />
              <div className="p-4">
                <p className="font-display text-lg font-semibold">{s.name}</p>
                <p className="font-mono text-sm">{s.hex}</p>
                <p className="mt-1 text-sm text-muted">{s.usage}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="contrast">
        <SectionHeading id="contrast" title="Contrast" hint="WCAG AA needs 4.5:1 for normal text and 3:1 for large text and interface shapes." />
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Colour contrast ratios</caption>
            <thead className="border-b border-line bg-canvas">
              <tr>
                <th scope="col" className="px-4 py-3">Pair</th>
                <th scope="col" className="px-4 py-3">Ratio</th>
                <th scope="col" className="px-4 py-3">Normal text AA</th>
              </tr>
            </thead>
            <tbody>
              {PAIRS.map((p) => {
                const ratio = contrastRatio(p.fg, p.bg);
                return (
                  <tr key={p.label} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{p.label}</td>
                    <td className="px-4 py-3 font-mono">{ratio.toFixed(2)}:1</td>
                    <td className="px-4 py-3 font-semibold">{ratio >= 4.5 ? 'Pass' : 'Fail'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="logo">
        <SectionHeading id="logo" title="Logo" hint="Original mark and wordmark, drawn as scalable SVG. Standalone files are in /public." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-center rounded-card border border-line bg-white p-8">
            <Logo />
          </div>
          <div className="flex items-center justify-center rounded-card bg-ink p-8">
            <Logo variant="dark" />
          </div>
          <div className="flex items-center justify-center gap-6 rounded-card border border-line bg-white p-8 md:col-span-2">
            <LogoMark size={64} />
            <LogoMark size={32} />
            <LogoMark size={16} />
          </div>
        </div>
      </section>

      <section aria-labelledby="rings">
        <SectionHeading id="rings" title="Academic-year rings" hint="Separate from the brand palette. The year always also appears as text." />
        <ul className="flex flex-wrap gap-8">
          {(['year-1', 'year-2', 'year-3', 'year-4', 'alumni'] as const).map((ring, i) => (
            <li key={ring} className="flex flex-col items-center gap-2 text-sm">
              <Avatar name={`Sample ${i + 1}`} ring={ring} size="lg" />
              {ring === 'alumni' ? 'Alumni (dashed)' : `${i + 1}${['st', 'nd', 'rd', 'th'][i]} year ${YEAR_RING_COLORS[(i + 1) as 1 | 2 | 3 | 4]}`}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="components">
        <SectionHeading id="components" title="Buttons and chips" />
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/design-system">Primary</ButtonLink>
          <ButtonLink href="/design-system" variant="secondary">Secondary</ButtonLink>
          <DisabledButton hint="Example of a disabled action">Disabled</DisabledButton>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip>Neutral</Chip>
          <Chip tone="selected">Selected</Chip>
          <Chip tone="promoted">Promoted</Chip>
          <Chip tone="sample">Sample</Chip>
          <Chip tone="dark">For sale</Chip>
        </div>
      </section>
    </div>
  );
}
