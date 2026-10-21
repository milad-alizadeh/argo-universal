import type * as React from 'react';
import { materialGlyphScale } from './material-glyph-scale';
import { NativeSymbolView } from './native-symbol-view';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { TablerSymbolPath } from './tabler-symbol-path';

// Android draws the Material Symbol natively, and a Tabler symbol from its path.
export function SymbolGlyph({
  symbol,
  ...props
}: SymbolGlyphProps): React.JSX.Element {
  if (symbol.kind === 'tabler')
    return <TablerSymbolPath {...props} name={symbol.tabler} />;

  return (
    <NativeSymbolView
      {...props}
      name={{ android: symbol.material }}
      glyphScale={materialScale({ symbol, ...props })}
      filled={symbol.filled}
    />
  );
}

// The one Material multiple, as the web's Material path takes, so a glyph is the same size in either.
function materialScale(props: SymbolGlyphProps): number {
  return props.symbol.kind === 'system' ? materialGlyphScale : props.glyphScale;
}
