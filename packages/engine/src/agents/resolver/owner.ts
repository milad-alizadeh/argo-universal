import { sep } from 'node:path';
import type { InstallationOwner } from '@repo/contracts';

const segmentsOf = (real: string): string[] => real.split(sep);

export type HomebrewFormula = { name: string; version: string };

// The formula and version folders a Homebrew file lives in: `<prefix>/Cellar/<formula>/<version>/…`.
export const homebrewFormula = (real: string): HomebrewFormula | undefined => {
  const segments = segmentsOf(real);
  const cellar = segments.lastIndexOf('Cellar');

  return cellar < 0 ? undefined : formulaAfter(segments.slice(cellar + 1));
};

const formulaAfter = ([name, version]: readonly string[]):
  | HomebrewFormula
  | undefined => (name && version ? { name, version } : undefined);

// npm's global packages live in `<prefix>/lib/node_modules`.
const isNpmGlobal = (real: string): boolean => {
  const segments = segmentsOf(real);

  return segments.some(
    (segment, index) =>
      segment === 'node_modules' && segments[index - 1] === 'lib',
  );
};

// A copy outside Argo's folder belongs to Homebrew when it sits in a Cellar, even an npm package Homebrew bottled.
export const outsideOwner = (real: string): InstallationOwner => {
  if (homebrewFormula(real)) return 'homebrew';

  return isNpmGlobal(real) ? 'npm' : 'unknown';
};
