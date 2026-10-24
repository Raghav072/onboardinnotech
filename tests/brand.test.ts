import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BRAND, NEUTRALS, YEAR_RING_COLORS } from '../src/lib/brand.ts';
import { contrastRatio } from '../src/lib/contrast.ts';

test('brand palette matches the brief exactly', () => {
  assert.deepEqual({ ...BRAND }, { blue: '#2391FF', yellow: '#FFF83F', amber: '#FFCD54', pink: '#F70063' });
});

test('year rings are four distinct colours', () => {
  assert.equal(new Set(Object.values(YEAR_RING_COLORS)).size, 4);
});

test('text pairings the UI relies on meet WCAG AA (4.5:1)', () => {
  const must: [string, string, string][] = [
    ['ink on white', NEUTRALS.ink, '#FFFFFF'],
    ['ink on blue buttons', NEUTRALS.ink, BRAND.blue],
    ['ink on amber', NEUTRALS.ink, BRAND.amber],
    ['ink on yellow', NEUTRALS.ink, BRAND.yellow],
    ['blue link text on white', NEUTRALS.blueText, '#FFFFFF'],
    ['muted on white', NEUTRALS.muted, '#FFFFFF'],
    ['muted on canvas', NEUTRALS.muted, NEUTRALS.canvas],
    ['ink on blue hover', NEUTRALS.ink, NEUTRALS.blueHover],
    ['white on ink chips', '#FFFFFF', NEUTRALS.ink],
  ];
  for (const [label, fg, bg] of must) {
    assert.ok(contrastRatio(fg, bg) >= 4.5, `${label} is ${contrastRatio(fg, bg).toFixed(2)}:1`);
  }
});

test('contrast helper is correct on known values', () => {
  assert.ok(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.01);
  assert.ok(Math.abs(contrastRatio('#FFFFFF', '#FFFFFF') - 1) < 0.001);
});

test('logo assets use the exact brand colours', () => {
  for (const f of ['logo-icon.svg', 'logo-icon-dark.svg', 'favicon.svg']) {
    const svg = readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8').toUpperCase();
    for (const hex of Object.values(BRAND)) assert.ok(svg.includes(hex.toUpperCase()), `${f} missing ${hex}`);
  }
});

test('all expected logo variants exist', () => {
  const files = readdirSync(new URL('../public', import.meta.url));
  for (const f of ['logo-icon.svg', 'logo-icon-dark.svg', 'logo-wordmark-light.svg', 'logo-wordmark-dark.svg', 'logo-lockup-light.svg', 'logo-lockup-dark.svg', 'favicon.svg']) {
    assert.ok(files.includes(f), `missing ${f}`);
  }
});
