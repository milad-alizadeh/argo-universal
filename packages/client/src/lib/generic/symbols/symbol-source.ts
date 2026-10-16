import type { AndroidSymbol } from 'expo-symbols';
import type { AppleSymbol, TablerSymbol } from './custom-symbols';

// SF names stay within SF Symbols 4, the set iOS 16.4 ships, or name one of Argo's custom symbols; Material names come from the Material Symbols font expo-symbols bundles.
interface SystemSymbolSource {
  sf: AppleSymbol;
  sfFilled?: AppleSymbol;
  material: AndroidSymbol;
}

// A git icon: one Tabler path, drawn on every platform (ADR-0019), so it has no Material name.
interface TablerSymbolSource {
  sf: TablerSymbol;
}

export type SymbolSource = SystemSymbolSource | TablerSymbolSource;

export function materialSymbol(
  symbol: SymbolSource,
): AndroidSymbol | undefined {
  return 'material' in symbol ? symbol.material : undefined;
}
