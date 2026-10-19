import { SymbolView } from 'expo-symbols';
import type * as React from 'react';
import type { SystemDrawing } from '../drawn-symbol';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { symbolWeight } from './symbol-weight';

const artworkPercent = 90;

const defaultExtent = 80;

/*
 * Measured ink extents of the shipped MaterialSymbols_200ExtraLight font at 100px.
 * Picker drawings use 90% of their slot; other symbols retain their text metrics.
 */
const materialArtworkExtent: Partial<
  Record<SystemDrawing['material'], number>
> = {
  deployed_code: 74.16667938232422,
  neurology: 68.43750762939453,
  bolt: 73.64583587646484,
  tune: 70.83334350585938,
  add: 50,
  smart_toy: 75,
};

export const materialArtworkScale = (name: SystemDrawing['material']): number =>
  artworkPercent / (materialArtworkExtent[name] ?? defaultExtent);

interface MaterialGlyphProps extends Pick<
  SymbolGlyphProps,
  'pixels' | 'weight'
> {
  symbol: SystemDrawing;
}

export function MaterialGlyph({
  symbol,
  pixels,
  weight,
}: MaterialGlyphProps): React.JSX.Element {
  return (
    <SymbolView
      key={String(symbol.filled)}
      name={{ web: symbol.material }}
      size={pixels}
      weight={symbolWeight(symbol.filled, weight)}
      tintColor="currentColor"
    />
  );
}
