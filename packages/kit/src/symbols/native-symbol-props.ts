import type { IconSize } from './icon-size';
import type { IconSymbol } from './icon-symbol';

/*
 * How a symbol inside a native tree is coloured: `foreground` is the kit's glyph token (glyph-tone.ts), which a row's
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
}
