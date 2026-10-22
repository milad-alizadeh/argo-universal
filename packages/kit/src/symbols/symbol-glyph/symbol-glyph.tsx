import type * as React from 'react';
import { isCustomSymbol } from '../custom-symbols';
import { AssetSymbol } from './asset-symbol';
import { NativeSymbolView } from './native-symbol-view';
import { SvgSymbolGlyph } from './svg-symbol';
import type { SymbolGlyphProps } from './symbol-glyph-props';

/*
 * iOS draws SF Symbols through SymbolView, and Argo's custom symbols from the app's asset catalog through
 * SwiftUI's Image, since SymbolView looks up system symbols only (ADR-0019); its SVG symbols draw from components (ADR-0041).
 */
export function SymbolGlyph({
  symbol,
  ...props
}: SymbolGlyphProps): React.JSX.Element {
  if (symbol.kind === 'svg')
    return <SvgSymbolGlyph {...props} name={symbol.svg} />;

  if (isCustomSymbol(symbol.sf))
    return <AssetSymbol {...props} assetName={symbol.sf} />;

  const name = { ios: symbol.sf };

  return <NativeSymbolView {...props} name={name} filled={symbol.filled} />;
}
