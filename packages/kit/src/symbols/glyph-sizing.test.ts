import { iconSizes } from '@repo/contracts/kit-symbols';
import { describe, expect, it } from 'vitest';
import { appleSymbolShare, glyphPixels } from './glyph-sizing';

describe('glyphPixels', () => {
  it('never draws a larger size smaller than the one before it', () => {
    for (const width of ['wide', 'phone'] as const) {
      const pixels = iconSizes.map((size) => glyphPixels(size, width));

      expect(pixels).toEqual([...pixels].sort((a, b) => a - b));
    }
  });

  it('never draws a phone glyph smaller than the desktop one', () => {
    for (const size of iconSizes) {
      expect(glyphPixels(size, 'phone')).toBeGreaterThanOrEqual(
        glyphPixels(size, 'wide'),
      );
    }
  });
});

describe('appleSymbolShare', () => {
  it('draws a chevron smaller in its box than another SF Symbol', () => {
    expect(appleSymbolShare(true)).toBeLessThan(appleSymbolShare(false));
  });
});
