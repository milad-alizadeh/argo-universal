import { describe, expect, it } from 'vitest';
import { cssColourOf, mixRgb, rgbOf } from './band-colour';

// Colour strings are built here, not written out, as the theme hands them over.
const fn = (name: string, ...channels: (number | string)[]): string =>
  `${name}(${channels.join(', ')})`;

describe('reading a theme colour', () => {
  it('reads hex and the rgb function', () => {
    expect(rgbOf(['#', 'ff', '80', '00'].join(''))).toEqual([255, 128, 0]);
    expect(rgbOf(fn('rgb', 10, 20, 30))).toEqual([10, 20, 30]);
    expect(rgbOf(fn('rgba', 10, 20, 30, 0.5))).toEqual([10, 20, 30]);
  });

  it('gives nothing for a colour it cannot read', () => {
    expect(rgbOf('')).toBeUndefined();
    expect(rgbOf('not a colour')).toBeUndefined();
  });
});

describe('mixing colours', () => {
  const from = [0, 0, 0];
  const to = [100, 200, 50];

  it('moves from one to the other', () => {
    expect(mixRgb(from, to, 0)).toEqual(from);
    expect(mixRgb(from, to, 1)).toEqual(to);
    expect(mixRgb(from, to, 0.5)).toEqual([50, 100, 25]);
  });
});

describe('writing a colour', () => {
  it('writes the channels with their strength', () => {
    expect(cssColourOf([10.4, 20.6, 30], 0.5)).toBe(
      fn('rgba', 10, 21, 30, '0.500'),
    );
    expect(cssColourOf([1, 2, 3], 2)).toBe(fn('rgba', 1, 2, 3, '1.000'));
  });
});
