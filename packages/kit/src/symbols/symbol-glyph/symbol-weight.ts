import type { SymbolViewProps } from 'expo-symbols';
import regular from 'expo-symbols/androidWeights/regular';
import filledFont from '../assets/material-filled.ttf';

// Argo's filled font holds one weight, the regular one, with the fill cut in.
const materialFilled = {
  name: 'MaterialSymbols_400Regular_Filled',
  font: filledFont,
} as const;

export const symbolWeight = (filled: boolean): SymbolViewProps['weight'] => ({
  ios: 'regular',
  android: filled ? materialFilled : regular,
});
