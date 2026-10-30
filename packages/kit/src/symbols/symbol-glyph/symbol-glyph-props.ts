import type { ColorValue } from 'react-native';
import type { DrawnSymbol } from '../drawn-symbol';
import type { GlyphLane } from '../row-glyph';

export interface SymbolGlyphProps {
  symbol: DrawnSymbol;
  pixels: number;
  // Set where the glyph draws in a row's leading lane rather than at its own size (row-glyph.ts).
  lane?: GlyphLane;
  tintColor?: ColorValue;
  // The colour classes again, for web, where CSS resolves state variants such as group-active that tintColor misses.
  colorClassName?: string;
  testID: string;
}
