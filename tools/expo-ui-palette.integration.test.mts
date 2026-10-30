import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '..');

/*
 * Expo UI's web components take their colours from a palette of their own, the `--expo-ui-*` variables its Host
 * writes into the page. Its dark ramp is a blue near-black, so any one Argo leaves unmapped draws a blue-tinted
 * surface in Graphite (#1443). Every variable Expo declares is mapped onto an Argo token in the web stylesheet,
 * and this reads both files to say so: an Expo UI release that adds a palette variable fails here rather than in
 * a screenshot. `--expo-ui-primary-*` is left out: the Host derives that scale from the seed colour Argo gives it.
 */
const stylesheet = join(repoRoot, 'tooling/uniwind/react-native-web.css');

const expoWebUtils = join(
  dirname(
    createRequire(join(repoRoot, 'packages/kit/package.json')).resolve(
      '@expo/ui/package.json',
    ),
  ),
  'build/universal/webUtils.js',
);

const declaration = /--expo-ui-[\w-]+(?=\s*:)/g;

const mapping = /(--expo-ui-[\w-]+):([^;]*);/g;

const seedScale = /^--expo-ui-primary-/;

const toToken = /^var\(--(?:color|shadow)-[\w-]+\)\s*!important$/;

const read = (file: string): string => readFileSync(file, 'utf8');

const paletteVariables = (source: string): string[] =>
  [...new Set(source.match(declaration) ?? [])]
    .filter((name): boolean => !seedScale.test(name))
    .sort();

function mappedValues(source: string): [string, string][] {
  return [...source.matchAll(mapping)].map((match): [string, string] => [
    match[1] ?? '',
    (match[2] ?? '').trim(),
  ]);
}

it('maps every Expo UI web palette variable onto an Argo token', () => {
  const expo = paletteVariables(read(expoWebUtils));

  expect(
    expo.length,
    'Expo UI declares no palette variables, so this test guards nothing',
  ).toBeGreaterThan(0);

  expect(paletteVariables(read(stylesheet))).toEqual(expo);
});

it('gives each Expo UI palette variable a token, never a colour of its own', () => {
  const colourOfItsOwn = mappedValues(read(stylesheet)).filter(
    ([, value]): boolean => !toToken.test(value),
  );

  expect(
    colourOfItsOwn,
    'Each --expo-ui-* variable takes a var(--color-*) or var(--shadow-*) token, marked so it beats Expo UI’s own rule.',
  ).toEqual([]);
});
