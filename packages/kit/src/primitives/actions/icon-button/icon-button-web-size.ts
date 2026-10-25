import type { IconButtonSize } from '@repo/contracts/kit-tokens';
import type { IconSize } from '../../../symbols/icon-size';

/*
 * The web's box is a Tailwind size class, and its glyph the `Icon` size table's step. The medium button keeps the small
 * glyph, as the desktop header's buttons draw it, so no glyph is under 16.
 */
const webSizes = {
  sm: { box: 'size-6', glyph: 'sm' },
  md: { box: 'size-8', glyph: 'sm' },
  lg: { box: 'size-10', glyph: 'md' },
} as const satisfies Record<IconButtonSize, { box: string; glyph: IconSize }>;

export const webBoxOf = (name: IconButtonSize): string => webSizes[name].box;

export const webGlyphOf = (name: IconButtonSize): IconSize =>
  webSizes[name].glyph;
