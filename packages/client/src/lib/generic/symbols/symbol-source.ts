import type { AndroidSymbol } from 'expo-symbols';
import type { AppleSymbol } from './custom-symbols';
import type { TablerSymbol } from './tabler-symbols';

// SF names stay within SF Symbols 6.0, the set iOS 18.0 and macOS 15.0 both ship (ADR-0029), or name one of Argo's custom symbols; Material names come from the Material Symbols font expo-symbols bundles. Plugin pairs are checked against the same releases (ADR-0025).
export interface SystemSymbolSource {
  sf: AppleSymbol;
  sfFilled?: AppleSymbol;
  material: AndroidSymbol;
}

// A git icon: one Tabler path, drawn on every platform (ADR-0019), so it has no SF or Material name.
export interface TablerSymbolSource {
  tabler: TablerSymbol;
}

export type SymbolSource = SystemSymbolSource | TablerSymbolSource;
