import { iconSizes } from '@repo/contracts/kit-symbols';
import { describe, expect, it } from 'vitest';
import { appleSymbolShare, glyphPixels } from './glyph-sizing';

describe('glyphPixels', () => {
  it('steps the desktop sizes 16, 20, 24', () => {
    expect(iconSizes.map((size) => glyphPixels(size, 'wide'))).toEqual([
      16, 20, 24,
    ]);
  });

  it('steps a phone one size up, to a limit of 24', () => {
    expect(iconSizes.map((size) => glyphPixels(size, 'phone'))).toEqual([
      20, 24, 24,
    ]);
  });
});

describe('appleSymbolShare', () => {
  it('draws an SF Symbol at four fifths of its box, a chevron at three quarters of that', () => {
    expect(appleSymbolShare(false)).toBeCloseTo(0.8);
    expect(appleSymbolShare(true)).toBeCloseTo(0.6);
  });
});
