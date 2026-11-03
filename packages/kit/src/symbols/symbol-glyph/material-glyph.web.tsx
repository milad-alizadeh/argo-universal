import { SymbolView } from 'expo-symbols';
import type * as React from 'react';
import { View } from 'react-native';
import type { SystemDrawing } from '../drawn-symbol';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { symbolWeight } from './symbol-weight';

interface MaterialGlyphProps extends Pick<SymbolGlyphProps, 'pixels'> {
  symbol: SystemDrawing;
}

// The bundled web font holds no plain filled circle, so the state dot is drawn rather than set as a glyph.
const dotName = 'circle';

// The dot fills half the icon's box, as SF Symbols' circle.fill sits in its own.
const dotShare = 0.5;

// A plain function, not a component, so the glyph is no deeper than the SymbolView it draws.
export function materialGlyph({
  symbol,
  pixels,
}: MaterialGlyphProps): React.JSX.Element {
  if (symbol.material === dotName) return <Dot pixels={pixels} />;

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

function Dot({ pixels }: Pick<SymbolGlyphProps, 'pixels'>): React.JSX.Element {
  const size = pixels * dotShare;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'currentColor',
      }}
    />
  );
}
