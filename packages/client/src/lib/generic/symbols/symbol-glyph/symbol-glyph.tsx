import type * as React from 'react';
import type { AppleSymbol } from '../custom-symbols';
import type { DrawnSymbol } from '../drawn-symbol';
import { type TablerAsset, tablerAsset } from '../tabler-symbols';
import { NativeSymbolView } from './native-symbol-view';
import type { SymbolGlyphProps } from './symbol-glyph-props';

const appleName = (symbol: DrawnSymbol): AppleSymbol | TablerAsset =>
  symbol.kind === 'tabler' ? tablerAsset(symbol.tabler) : symbol.sf;

// iOS finds Argo's custom and Tabler symbols in the app's asset catalog, through the patched SymbolView (patches/README.md).
export function SymbolGlyph({
  symbol,
  ...props
}: SymbolGlyphProps): React.JSX.Element {
  return (
    <NativeSymbolView
      {...props}
      name={{ ios: appleName(symbol) }}
      filled={symbol.kind === 'system' && symbol.filled}
    />
  );
}
