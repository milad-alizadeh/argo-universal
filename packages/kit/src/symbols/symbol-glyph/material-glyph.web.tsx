import { SymbolView } from 'expo-symbols';
import type * as React from 'react';
import type { SystemDrawing } from '../drawn-symbol';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { symbolWeight } from './symbol-weight';

interface MaterialGlyphProps extends Pick<SymbolGlyphProps, 'pixels'> {
  symbol: SystemDrawing;
}

export function MaterialGlyph({
  symbol,
  pixels,
}: MaterialGlyphProps): React.JSX.Element {
  return (
    <SymbolView
      key={String(symbol.filled)}
      name={{ web: symbol.material }}
      size={pixels}
      weight={symbolWeight(symbol.filled)}
      tintColor="currentColor"
    />
  );
}
