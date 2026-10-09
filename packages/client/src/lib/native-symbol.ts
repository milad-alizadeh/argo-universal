import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

// SF names stay within SF Symbols 4, the set iOS 16.4 ships; Material names come from the Material Symbols font expo-symbols bundles.
export interface NativeSymbol {
  sf: SFSymbol;
  sfFilled?: SFSymbol;
  material: AndroidSymbol;
}
