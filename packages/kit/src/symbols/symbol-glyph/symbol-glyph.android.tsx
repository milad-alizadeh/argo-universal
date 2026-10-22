import type * as React from 'react';
import { NativeSymbolView } from './native-symbol-view';
import { SvgSymbolGlyph } from './svg-symbol';
import type { SymbolGlyphProps } from './symbol-glyph-props';

// Android draws the Material Symbol natively, and an SVG symbol from its component.
export function SymbolGlyph({
  symbol,
  ...props
}: SymbolGlyphProps): React.JSX.Element {
  if (symbol.kind === 'svg')
    return <SvgSymbolGlyph {...props} name={symbol.svg} />;

  return (
    <NativeSymbolView
      {...props}
      name={{ android: symbol.material }}
      filled={symbol.filled}
    />
  );
}
