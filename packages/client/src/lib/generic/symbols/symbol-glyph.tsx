import { type AndroidSymbol, SymbolView } from 'expo-symbols';
import type * as React from 'react';
import { type ColorValue, Platform } from 'react-native';
import type { AppleSymbol } from './custom-symbols';
import { symbolWeight } from './symbol-weight';

const materialOpticalScale = 1.125;

export interface SymbolGlyphProps {
  sf: AppleSymbol;
  material: AndroidSymbol;
  filled: boolean;
  pixels: number;
  tintColor?: ColorValue;
  // The colour classes again, for web, where CSS resolves state variants such as group-active that tintColor misses.
  colorClassName?: string;
  testID: string;
}

/*
 * iOS draws the SF Symbol and Android the Material Symbol, both natively. iOS finds a custom symbol in the app's
 * asset catalog, through the patched SymbolView (patches/README.md).
 */
export function SymbolGlyph({
  sf,
  material,
  filled,
  pixels,
  tintColor,
  testID,
}: SymbolGlyphProps): React.JSX.Element {
  return (
    <SymbolView
      key={String(filled)}
      name={{ ios: sf, android: material }}
      size={pixels}
      style={
        Platform.OS === 'android'
          ? { transform: [{ scale: materialOpticalScale }] }
          : undefined
      }
      weight={symbolWeight(filled)}
      tintColor={tintColor}
      testID={testID}
    />
  );
}
