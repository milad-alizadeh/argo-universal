import type { ColorValue } from 'react-native';
import type { DrawnSymbol } from '../drawn-symbol';

export interface SymbolGlyphProps {
  symbol: DrawnSymbol;
  pixels: number;
  tintColor?: ColorValue;
  // The colour classes again, for web, where CSS resolves state variants such as group-active that tintColor misses.
  colorClassName?: string;
  testID: string;
}
