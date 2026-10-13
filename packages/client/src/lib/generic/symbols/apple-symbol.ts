import type { AppleSymbol } from './custom-symbols';
import type { SymbolSource } from './symbol-source';

export function appleSymbol(
  symbol: SymbolSource,
  filled: boolean | undefined,
): AppleSymbol {
  return (filled === true && symbol.sfFilled) || symbol.sf;
}
