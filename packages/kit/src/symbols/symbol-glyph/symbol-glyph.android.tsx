import { Icon, type IconName } from '@expo/ui';
import type * as React from 'react';
import { View } from 'react-native';
import { Host } from '#primitives/native/host';
import type { DrawnSymbol } from '../drawn-symbol';
import {
  materialFilledImage,
  materialImage,
} from '../material-images/material-images';
import { NativeSymbolView } from './native-symbol-view';
import { SvgSymbolGlyph } from './svg-symbol';
import type { SymbolGlyphProps } from './symbol-glyph-props';

type MaterialSymbol = Extract<DrawnSymbol, { kind: 'system' }>;

const drawing = (symbol: MaterialSymbol): IconName | undefined =>
  symbol.filled
    ? materialFilledImage(symbol.material)
    : materialImage(symbol.material);

function DrawingGlyph(
  props: Omit<SymbolGlyphProps, 'symbol'> & { source: IconName },
): React.JSX.Element {
  return (
    <View
      testID={props.testID}
      style={{ width: props.pixels, height: props.pixels }}
    >
      <Host matchContents>
        <Icon name={props.source} size={props.pixels} color={props.tintColor} />
      </Host>
    </View>
  );
}

function FontGlyph({
  symbol,
  ...props
}: Omit<SymbolGlyphProps, 'symbol'> & {
  symbol: MaterialSymbol;
}): React.JSX.Element {
  return (
    <NativeSymbolView
      {...props}
      name={{ android: symbol.material }}
      filled={symbol.filled}
    />
  );
}

function MaterialGlyph({
  symbol,
  ...props
}: Omit<SymbolGlyphProps, 'symbol'> & {
  symbol: MaterialSymbol;
}): React.JSX.Element {
  const source = drawing(symbol);

  if (source) return <DrawingGlyph {...props} source={source} />;

  return <FontGlyph {...props} symbol={symbol} />;
}

/*
 * Android draws a Material Symbol from the same XML drawing Expo UI's Icon draws inside a button or menu (one source,
 * one weight); a name with no drawing keeps the font, and an SVG symbol draws from its component. A row's lane is
 * dropped: a Material glyph is drawn padded inside its 24-unit grid, which is the box stock Android Settings gives a
 * row (row-glyph.ts), so it draws at the lane itself.
 */
export function SymbolGlyph({
  symbol,
  lane: _lane,
  ...props
}: SymbolGlyphProps): React.JSX.Element {
  if (symbol.kind === 'svg')
    return <SvgSymbolGlyph {...props} name={symbol.svg} />;

  return <MaterialGlyph {...props} symbol={symbol} />;
}
