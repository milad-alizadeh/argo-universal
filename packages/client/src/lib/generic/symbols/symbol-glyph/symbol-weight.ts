import type { SymbolViewProps } from 'expo-symbols';
import extraLight from 'expo-symbols/androidWeights/extraLight';
import regular from 'expo-symbols/androidWeights/regular';
import filledFont from '../assets/material-filled.ttf';

// Material draws ExtraLight to sit with SF's Regular; a glyph that must read as heavily as its SF Symbol takes Material's Regular.
export type SymbolWeight = 'regular';

const materialWeight = (
  filled: boolean,
  weight: SymbolWeight | undefined,
): NonNullable<Exclude<SymbolViewProps['weight'], string>>['android'] => {
  if (weight === 'regular') return regular;
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
