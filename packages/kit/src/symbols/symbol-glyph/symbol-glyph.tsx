import type { SymbolViewProps } from 'expo-symbols';
import type * as React from 'react';
import { isCustomSymbol } from '../custom-symbols';
import { appleRowSymbolPixels } from '../glyph-sizing';
import { AssetSymbol } from './asset-symbol';
import { NativeSymbolView } from './native-symbol-view';
import { SvgSymbolGlyph } from './svg-symbol';
import type { SymbolGlyphProps } from './symbol-glyph-props';

/*
 * iOS draws SF Symbols through SymbolView, and Argo's custom symbols from the app's asset catalog through
 * SwiftUI's Image, since SymbolView looks up system symbols only (ADR-0019); its SVG symbols draw from components (ADR-0041).
 *
 * An SF Symbol's ink overruns its point size where an SVG or asset symbol is drawn inside its box, so only the
 * system symbol shrinks inside a row's lane, to the size stock iOS Settings draws a row's mark (row-glyph.ts).
 */
export function SymbolGlyph({
  symbol,
  ...props
}: SymbolGlyphProps): React.JSX.Element {
  if (symbol.kind === 'svg')
    return <SvgSymbolGlyph {...props} name={symbol.svg} />;

  if (isCustomSymbol(symbol.sf))
    return <AssetSymbol {...props} assetName={symbol.sf} />;

  return <SystemSymbol {...props} sf={symbol.sf} filled={symbol.filled} />;
}

type SystemSymbolProps = Omit<SymbolGlyphProps, 'symbol'> & {
  sf: Extract<SymbolViewProps['name'], string>;
  filled: boolean;
};

function SystemSymbol({
  lane,
  sf,
  ...props
}: SystemSymbolProps): React.JSX.Element {
  const pixels =
    lane === 'row' ? appleRowSymbolPixels(props.pixels) : props.pixels;

  return <NativeSymbolView {...props} pixels={pixels} name={{ ios: sf }} />;
}
