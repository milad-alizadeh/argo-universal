import type { AndroidSymbol } from 'expo-symbols';
import type { AppleSymbol } from './custom-symbols';

// SF names stay within SF Symbols 4.1, the set iOS 16.4 and macOS 13.0 both ship, or name one of Argo's custom symbols; Material names come from the Material Symbols font expo-symbols bundles. Plugin pairs are checked against the same releases (ADR-0025).
export interface SymbolSource {
  sf: AppleSymbol;
  sfFilled?: AppleSymbol;
  material: AndroidSymbol;
}
