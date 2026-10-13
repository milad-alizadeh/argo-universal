import { type AndroidSymbol, SymbolView } from 'expo-symbols';
import type * as React from 'react';
import type { ColorValue, ViewStyle } from 'react-native';
import type { AppleSymbol } from '../custom-symbols';
import { type SymbolWeight, symbolWeight } from './symbol-weight';

export interface SymbolGlyphProps {
  sf: AppleSymbol;
  material: AndroidSymbol;
  filled: boolean;
  pixels: number;
  glyphScale: number;
  weight?: SymbolWeight;
  tintColor?: ColorValue;
  // The colour classes again, for web, where CSS resolves state variants such as group-active that tintColor misses.
  colorClassName?: string;
  testID: string;
}

/*
 * iOS draws the SF Symbol and Android the Material Symbol, both natively. iOS finds a custom symbol in the app's
 * asset catalog, through the patched SymbolView (patches/README.md).
 */
export function SymbolGlyph(props: SymbolGlyphProps): React.JSX.Element {
  return (
    <SymbolView
      key={String(props.filled)}
      name={{ ios: props.sf, android: props.material }}
      size={props.pixels}
      style={scaledBy(props.glyphScale)}
      weight={symbolWeight(props.filled, props.weight)}
      tintColor={props.tintColor}
      testID={props.testID}
    />
  );
}

function scaledBy(glyphScale: number): ViewStyle | undefined {
  return glyphScale === 1 ? undefined : { transform: [{ scale: glyphScale }] };
}
