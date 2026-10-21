import type { IconSymbol } from '@repo/contracts/kit-symbols';
import { iconSymbols } from './icon-names';
import type { SymbolSource } from './symbol-source';

export type { IconSymbol } from '@repo/contracts/kit-symbols';

export interface ResolvedIcon {
  symbol: SymbolSource;
  // Names the icon in test ids.
  key: string;
  materialFill: boolean;
}

export function resolveIcon(icon: IconSymbol): ResolvedIcon {
  if (typeof icon === 'string')
    return { symbol: iconSymbols[icon], key: icon, materialFill: true };

  // Argo's filled Material font holds only Argo's own icons (ADR-0019), so any other Material glyph would draw blank filled.
  return { symbol: icon, key: icon.material, materialFill: false };
}
