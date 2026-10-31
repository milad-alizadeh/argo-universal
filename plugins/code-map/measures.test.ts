import { describe, expect, it } from 'vitest';
import { changeIntensity } from './measures';
import type { CodeFile } from './model';

const hottest = 10;

// Branching lines that put a file in the low, middle and high band.
const bands = [0, 9, 20];

// The strongest shade any tile reaches; stronger ones sit too near a caption's colour to read it (#1736).
const strongest = 0.375;

function changed(branches: number, touches: number): CodeFile {
  return { path: 'a.txt', lines: 10, branches, touches };
}

describe('changeIntensity', () => {
  it.each(bands)(
    'keeps a hot file in band %i below the strongest shade',
    (branches) => {
      expect(
        changeIntensity(changed(branches, hottest), hottest),
      ).toBeLessThanOrEqual(strongest);
    },
  );

  it('gives a file changed more often a stronger shade', () => {
    const quiet = changeIntensity(changed(0, 1), hottest);
    const busy = changeIntensity(changed(0, hottest), hottest);

    expect(busy).toBeGreaterThan(quiet);
  });

  it('still shades a file nobody changed', () => {
    expect(changeIntensity(changed(0, 0), hottest)).toBeGreaterThan(0);
  });
});
