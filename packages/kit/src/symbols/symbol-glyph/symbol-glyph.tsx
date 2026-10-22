import type * as React from 'react';
import { isCustomSymbol } from '../custom-symbols';
import { tablerAsset } from '../tabler-symbols';
import { AssetSymbol } from './asset-symbol';
import { NativeSymbolView } from './native-symbol-view';
import type { SymbolGlyphProps } from './symbol-glyph-props';

/*
 * iOS draws SF Symbols through SymbolView, and Argo's custom and Tabler symbols from the app's asset catalog through
 * SwiftUI's Image, since SymbolView looks up system symbols only (ADR-0019).
 */
export function SymbolGlyph({
  symbol,
  ...props
}: SymbolGlyphProps): React.JSX.Element {
  if (symbol.kind === 'tabler')
    return <AssetSymbol {...props} assetName={tablerAsset(symbol.tabler)} />;

  if (isCustomSymbol(symbol.sf))
    return <AssetSymbol {...props} assetName={symbol.sf} />;

  const name = { ios: symbol.sf };

  return <NativeSymbolView {...props} name={name} filled={symbol.filled} />;
}
