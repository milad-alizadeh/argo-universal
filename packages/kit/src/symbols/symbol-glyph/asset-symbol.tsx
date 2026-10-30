import { Image, type ImageProps } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  font,
  foregroundStyle,
  frame,
  resizable,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import type { ViewStyle } from 'react-native';
import { Host } from '#primitives/native/host';
import { decorativeGlyph } from '../decorative-glyph';
import type { SymbolGlyphProps } from './symbol-glyph-props';

interface AssetSymbolProps extends Omit<
  SymbolGlyphProps,
  'symbol' | 'colorClassName'
> {
  assetName: string;
}

const hostStyle = ({ pixels }: AssetSymbolProps): ViewStyle => ({
  width: pixels,
  height: pixels,
});

/*
 * The symbol set's box is fitted to the icon box, as SymbolView fits a system symbol's image, so a custom symbol is the
 * size of the system ones beside it. Regular is SymbolView's iOS weight in `symbolWeight`.
 */
function symbolModifiers({
  pixels,
  tintColor,
}: AssetSymbolProps): ImageProps['modifiers'] {
  return [
    resizable(),
    font({ size: pixels, weight: 'regular' }),
    aspectRatio({ contentMode: 'fit' }),
    frame({ width: pixels, height: pixels }),
    ...(tintColor === undefined ? [] : [foregroundStyle(tintColor)]),
  ];
}

// An asset-catalog symbol in a React Native tree, as `NativeSymbol` draws one inside a SwiftUI tree.
export function AssetSymbol(props: AssetSymbolProps): React.JSX.Element {
  return (
    <Host {...decorativeGlyph} style={hostStyle(props)} testID={props.testID}>
      <Image assetName={props.assetName} modifiers={symbolModifiers(props)} />
    </Host>
  );
}
