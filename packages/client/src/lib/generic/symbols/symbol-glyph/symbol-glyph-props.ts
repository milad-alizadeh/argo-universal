import type { ColorValue } from 'react-native';
import type { DrawnSymbol } from '../drawn-symbol';
import type { SymbolWeight } from './symbol-weight';

export interface SymbolGlyphProps {
  symbol: DrawnSymbol;
  pixels: number;
  glyphScale: number;
  fitArtwork?: boolean;
  weight?: SymbolWeight;
  tintColor?: ColorValue;
  // The colour classes again, for web, where CSS resolves state variants such as group-active that tintColor misses.
  colorClassName?: string;
  testID: string;
}
