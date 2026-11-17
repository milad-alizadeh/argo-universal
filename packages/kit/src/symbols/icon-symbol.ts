import type { IconSymbol } from '@repo/contracts/kit-symbols';
import { iconSymbols } from './icon-names';
import type { MarkupSymbolSource, SymbolSource } from './symbol-source';

export type { IconSymbol } from '@repo/contracts/kit-symbols';

// What `Icon` draws: any icon a kit component takes, or, App-side only, a Plugin's own markup (ADR-0058).
export type DrawnIcon = IconSymbol | MarkupSymbolSource;

export interface ResolvedIcon {
  symbol: SymbolSource;
  // Names the icon in test ids.
  key: string;
  materialFill: boolean;
}

export function resolveIcon(icon: DrawnIcon): ResolvedIcon {
  if (typeof icon === 'string')
    return { symbol: iconSymbols[icon], key: icon, materialFill: true };

  if ('markup' in icon)
    return { symbol: icon, key: 'plugin', materialFill: false };

  // Argo's filled Material font holds only Argo's own icons (ADR-0019), so any other Material glyph would draw blank filled.
  return { symbol: icon, key: icon.material, materialFill: false };
}
