import { describe, expect, it } from 'vitest';
import { changeIntensity } from './measures';
import type { CodeFile } from './model';

// Branching lines that put a file in each band.
const branches = { low: 0, middle: 9, high: 20 };

const hottest = 10;

function changed(branching: number, touches: number): CodeFile {
  return { path: 'a.txt', lines: 10, branches: branching, touches };
}

// The shade a caption drawn in the foreground token can still be read over (#1736). Canvas picks the nearest of nine shades.
const shadeSteps = 8;

const strongestShade = (branching: number): number =>
  Math.round(
    changeIntensity(changed(branching, hottest), hottest) * shadeSteps,
  );

describe('changeIntensity', () => {
  it('stops a hot file short of the shades that swallow its caption', () => {
    expect(strongestShade(branches.low)).toBe(3);
    expect(strongestShade(branches.high)).toBe(2);
    expect(strongestShade(branches.middle)).toBe(1);
  });

  it('gives a file changed more often a shade at least as strong', () => {
    const quiet = changeIntensity(changed(branches.low, 1), hottest);
    const busy = changeIntensity(changed(branches.low, hottest), hottest);

    expect(busy).toBeGreaterThan(quiet);
  });

  it('still tells an unchanged file from none being drawn', () => {
    expect(changeIntensity(changed(branches.low, 0), hottest)).toBeGreaterThan(
      0,
    );
  });
});
