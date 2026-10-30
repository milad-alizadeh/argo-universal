import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type * as React from 'react';
import { decorativeGlyph } from '../decorative-glyph';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { symbolWeight } from './symbol-weight';

export interface NativeSymbolViewProps extends Omit<
  SymbolGlyphProps,
  'symbol' | 'colorClassName'
> {
  name: SymbolViewProps['name'];
  filled: boolean;
}

export function NativeSymbolView(
  props: NativeSymbolViewProps,
): React.JSX.Element {
  return (
    <SymbolView
      {...decorativeGlyph}
      key={String(props.filled)}
      name={props.name}
      size={props.pixels}
      weight={symbolWeight(props.filled)}
      tintColor={props.tintColor}
      testID={props.testID}
    />
  );
}
