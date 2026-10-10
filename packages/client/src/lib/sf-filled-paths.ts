import type { SFSymbol } from 'expo-symbols';

export interface SymbolPath {
  d: string;
  width: number;
  height: number;
}

// Outlines of filled SF Symbols at 16 points, from tools/sf-symbols/sf-symbol-svg.swift, for where Material Symbols have no filled form.
export const sfFilledPaths: Partial<Record<SFSymbol, SymbolPath>> = {
  'bolt.fill': {
    d: 'M2 11.606C2 11.935 2.253 12.179 2.607 12.179L7.369 12.179L4.857 19.006C4.528 19.874 5.43 20.338 5.995 19.63L13.656 10.056C13.799 9.879 13.875 9.71 13.875 9.516C13.875 9.196 13.622 8.943 13.268 8.943L8.506 8.943L11.018 2.116C11.347 1.248 10.445 0.785 9.88 1.501L2.219 11.067C2.076 11.252 2 11.421 2 11.606Z',
    width: 16,
    height: 21,
  },
};
