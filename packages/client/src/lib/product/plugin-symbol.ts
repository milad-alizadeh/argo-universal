import type { PluginIcon } from '@repo/contracts/plugins';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import type { SystemSymbolSource } from '@repo/kit/symbols/symbol-source';

// A Plugin may target only Apple or only Material platforms; the others still need a glyph in its Rail tile and drawer row.
export const pluginSymbol = (icon: PluginIcon): SystemSymbolSource => ({
  ...iconSymbols.plug,
  ...icon,
});
