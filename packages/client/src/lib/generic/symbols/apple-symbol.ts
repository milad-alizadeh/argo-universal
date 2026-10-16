import type { AppleSymbol } from './custom-symbols';
import type { SymbolSource } from './symbol-source';

function filledVariant(symbol: SymbolSource): AppleSymbol | undefined {
  return 'sfFilled' in symbol ? symbol.sfFilled : undefined;
}

export function appleSymbol(
  symbol: SymbolSource,
  filled: boolean | undefined,
): AppleSymbol {
  return (filled === true && filledVariant(symbol)) || symbol.sf;
}
