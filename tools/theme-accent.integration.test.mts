import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

/*
 * `--color-accent` is the one token the kit's Host hands to SwiftUI and Jetpack Compose as the tint every stock
 * control draws itself from: a filter pill, a slider, a switch's on track, a checkmark, a picker's value. Giving it
 * a hue therefore repaints all of them at once, which is how Graphite came to draw its native controls in system
 * blue (#1663), and nothing short of a device screenshot showed it. Graphite is a neutral near-black whose text is
 * neutral and whose edges are white alphas, as theme.css says where it declares the dark theme, and the light theme
 * pairs its accent with primary; a hue in either belongs to a tone token, not to the tint. So this reads the themes
 * and holds every accent to the neutral ramp at once.
 */
const theme = join(import.meta.dirname, '..', 'tooling/uniwind/theme.css');

const accents = (source: string): string[] =>
  [...source.matchAll(/--color-accent:([^;]*);/g)].map((match): string =>
    (match[1] ?? '').trim(),
  );

const neutral = /^var\(--color-neutral-\d+\)$/;

it('tints every theme from the neutral palette', () => {
  const declared = accents(readFileSync(theme, 'utf8'));

  expect(
    declared.length,
    'theme.css declares no accent, so this test guards nothing',
  ).toBeGreaterThan(1);

  expect(
    declared.filter((value): boolean => !neutral.test(value)),
    'Graphite and the light theme both take their accent from the neutral ramp; a hue belongs to a tone token.',
  ).toEqual([]);
});
