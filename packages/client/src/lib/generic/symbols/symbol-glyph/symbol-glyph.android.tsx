import type * as React from 'react';
import { materialArtworkScale } from './material-artwork-scale';
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

// Always fitted, as the web's Material path is, so a glyph is the same size on Android and in a browser.
function materialScale(props: SymbolGlyphProps): number {
  return props.symbol.kind === 'system'
    ? materialArtworkScale(props.symbol.material)
    : props.glyphScale;
}
