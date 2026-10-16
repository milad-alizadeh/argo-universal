import type { PluginIcon } from '@repo/contracts/plugins';
import { iconSymbols } from '#lib/generic/symbols/icon-names';
import type { SymbolSource } from '#lib/generic/symbols/symbol-source';

// A Plugin may target only Apple or only Material platforms; the others still need a glyph in its Rail tile and drawer row.
export const pluginSymbol = (icon: PluginIcon): SymbolSource => ({
  ...iconSymbols.plug,
  ...icon,
});
