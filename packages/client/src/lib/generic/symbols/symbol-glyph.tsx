import { type AndroidSymbol, SymbolView } from 'expo-symbols';
import type * as React from 'react';
import { type ColorValue, Platform } from 'react-native';
import type { AppleSymbol } from './custom-symbols';
import { symbolWeight } from './symbol-weight';

export interface SymbolGlyphProps {
  sf: AppleSymbol;
  material: AndroidSymbol;
  pixels: number;
  tintColor?: ColorValue;
  // The colour classes again, for web, where CSS resolves state variants such as group-active that tintColor misses.
  colorClassName?: string;
  testID: string;
}

// Material Symbols leave 2 of their 24 units empty on every side, so they draw 1.2 times larger to match SF Symbols' ink.
const androidInkScale = 1.2;

/*
 * iOS draws the SF Symbol and Android the Material Symbol, both natively. iOS finds a custom symbol in the app's
 * asset catalog, through the patched SymbolView (patches/README.md).
 */
export function SymbolGlyph({
  sf,
  material,
  pixels,
  tintColor,
  testID,
}: SymbolGlyphProps): React.JSX.Element {
  const scale = Platform.OS === 'android' ? androidInkScale : 1;
  // The glyph overflows an equal margin, so the layout box stays `pixels` square.
  const overflow = (pixels - pixels * scale) / 2;
  return (
    <SymbolView
      name={{ ios: sf, android: material }}
      size={pixels * scale}
      style={scale === 1 ? undefined : { margin: overflow }}
      weight={symbolWeight}
      tintColor={tintColor}
      testID={testID}
    />
  );
}
