import type * as React from 'react';
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
      filled={symbol.filled}
    />
  );
}
