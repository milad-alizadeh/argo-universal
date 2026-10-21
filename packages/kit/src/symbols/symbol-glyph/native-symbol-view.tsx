import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type * as React from 'react';
import type { ViewStyle } from 'react-native';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { symbolWeight } from './symbol-weight';

export interface NativeSymbolViewProps extends Omit<
  SymbolGlyphProps,
  'symbol' | 'colorClassName'
> {
  name: SymbolViewProps['name'];
  filled: boolean;
}

function scaledBy(glyphScale: number): ViewStyle | undefined {
  return glyphScale === 1 ? undefined : { transform: [{ scale: glyphScale }] };
}

export function NativeSymbolView(
  props: NativeSymbolViewProps,
): React.JSX.Element {
  return (
    <SymbolView
      key={String(props.filled)}
      name={props.name}
      size={props.pixels}
      style={scaledBy(props.glyphScale)}
      weight={symbolWeight(props.filled, props.weight)}
      tintColor={props.tintColor}
      testID={props.testID}
    />
  );
}
