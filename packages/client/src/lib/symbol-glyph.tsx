import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import type * as React from 'react';
import type { ColorValue } from 'react-native';
import { symbolWeight } from './symbol-weight';

export interface SymbolGlyphProps {
  sf: SFSymbol;
  material: AndroidSymbol;
  pixels: number;
  tintColor?: ColorValue;
  testID: string;
}

// iOS draws the SF Symbol and Android the Material Symbol, both natively.
export function SymbolGlyph({
  sf,
  material,
  pixels,
  tintColor,
  testID,
}: SymbolGlyphProps): React.JSX.Element {
  return (
    <SymbolView
      name={{ ios: sf, android: material }}
      size={pixels}
      weight={symbolWeight}
      tintColor={tintColor}
      testID={testID}
    />
  );
}
