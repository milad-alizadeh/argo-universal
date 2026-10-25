import type { IconSize } from '@repo/contracts/kit-symbols';
import { desktopChevronScale } from './chevron-scale';

// Pixels a glyph draws at: its size on a desktop window (`wide`) and on a phone.
type GlyphPixels = 16 | 20 | 24;

export type GlyphScale = 'wide' | 'phone';

/*
 * The one table of glyph sizes; nothing else holds an icon pixel value. No glyph is under 16, where a desktop glyph
 * stops reading. The phone steps one size up, to a limit of 24, since its text is larger. Adjust the desktop column
 * when the desktop font changes. Native glyphs draw at these pixels as they stand.
 */
const glyphPixelTable = {
  sm: { wide: 16, phone: 20 },
  md: { wide: 20, phone: 24 },
  lg: { wide: 24, phone: 24 },
} as const satisfies Record<IconSize, Record<GlyphScale, GlyphPixels>>;

export function glyphPixels(size: IconSize, scale: GlyphScale): number {
  return glyphPixelTable[size][scale];
}

/*
 * An SF Symbol fills most of its point size where a Material glyph keeps padding in its 24-unit grid, so at one size
 * the SF Symbol reads larger. Every SF Symbol on desktop draws at this share of its box to match Material.
 */
const appleSymbolScale = 0.8;

// The share of a glyph's pixels an SF Symbol draws at on desktop; a chevron draws smaller still.
export function appleSymbolShare(isChevron: boolean): number {
  return appleSymbolScale * (isChevron ? desktopChevronScale : 1);
}
