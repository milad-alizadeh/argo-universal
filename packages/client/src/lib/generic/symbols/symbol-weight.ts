import type { SymbolViewProps } from 'expo-symbols';
import extraLight from 'expo-symbols/androidWeights/extraLight';
import filledFont from './assets/material-filled.ttf';

export function symbolWeight(filled: boolean): SymbolViewProps['weight'] {
  return {
    ios: 'regular',
    android: filled
      ? { name: 'MaterialSymbols_200ExtraLight_Filled', font: filledFont }
      : extraLight,
  } as const;
}
