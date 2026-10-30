import type { IconSize } from './icon-size';
import type { IconSymbol } from './icon-symbol';

/*
 * How a symbol inside a native tree is coloured: `foreground` is the kit's glyph token (row-glyph.ts), which a row's
 * leading glyph takes so the platform's own tint cannot colour it; `muted` is the platform's secondary tone, as a
 * row's chevron or a search lens draws.
 */
export type NativeSymbolTone = 'foreground' | 'muted';

export interface NativeSymbolProps {
  name: IconSymbol;
  // Unset, the size the control around the icon gives it (IconSizeProvider).
  size?: IconSize;
  filled?: boolean;
  // Unset, the symbol takes the colour its surroundings give it (iOS: the SwiftUI tint; Compose: the content colour).
  tone?: NativeSymbolTone;
  /*
   * Set on a row's leading glyph, which sits in a lane rather than drawing at its own size: the lane keeps the
   * width `size` gives it and each platform draws the symbol at what its own Settings app draws (row-glyph.ts).
   */
  lane?: 'row';
}
