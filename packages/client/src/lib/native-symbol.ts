import type { AndroidSymbol } from 'expo-symbols';
import type { AppleSymbol } from './custom-symbols';

// SF names stay within SF Symbols 4, the set iOS 16.4 ships, or name one of Argo's custom symbols; Material names come from the Material Symbols font expo-symbols bundles.
export interface NativeSymbol {
  sf: AppleSymbol;
  sfFilled?: AppleSymbol;
  material: AndroidSymbol;
}
