import type { SymbolViewProps } from 'expo-symbols';
import extraLight from 'expo-symbols/androidWeights/extraLight';
import light from 'expo-symbols/androidWeights/light';
import filledFont from '../assets/material-filled.ttf';

// Material draws ExtraLight to sit with SF's Regular; a glyph on a filled disc, as Send's arrow, needs Material's Light to read like its SF Symbol.
export type SymbolWeight = 'light';

// Argo's filled font holds one weight, and the fill is more ink than any weight: a filled glyph takes it either way.
const materialFilled = {
  name: 'MaterialSymbols_200ExtraLight_Filled',
  font: filledFont,
} as const;

/*
 * Filled comes before Light, as the rail's selected tile already assumes: Light asked for the stroke nearest SF's
 * Regular, and taking it over the fill drew Stop as an outlined square where its SF Symbol is solid.
 */
const materialWeight = (
  filled: boolean,
  weight: SymbolWeight | undefined,
): NonNullable<Exclude<SymbolViewProps['weight'], string>>['android'] => {
  if (filled) return materialFilled;

  return weight === 'light' ? light : extraLight;
};

export function symbolWeight(
  filled: boolean,
  weight?: SymbolWeight,
): SymbolViewProps['weight'] {
  return { ios: 'regular', android: materialWeight(filled, weight) } as const;
}
