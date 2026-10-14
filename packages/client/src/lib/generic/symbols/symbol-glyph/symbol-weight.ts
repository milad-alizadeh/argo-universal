import type { SymbolViewProps } from 'expo-symbols';
import extraLight from 'expo-symbols/androidWeights/extraLight';
import light from 'expo-symbols/androidWeights/light';
import filledFont from '../assets/material-filled.ttf';

// Material draws ExtraLight to sit with SF's Regular; a glyph on a filled disc, as Send's arrow, needs Material's Light to read like its SF Symbol.
export type SymbolWeight = 'light';

const materialWeight = (
  filled: boolean,
  weight: SymbolWeight | undefined,
): NonNullable<Exclude<SymbolViewProps['weight'], string>>['android'] => {
  if (weight === 'light') return light;

  return filled
    ? { name: 'MaterialSymbols_200ExtraLight_Filled', font: filledFont }
    : extraLight;
};

export function symbolWeight(
  filled: boolean,
  weight?: SymbolWeight,
): SymbolViewProps['weight'] {
  return { ios: 'regular', android: materialWeight(filled, weight) } as const;
}
