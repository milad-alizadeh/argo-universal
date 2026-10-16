import type { PluginIcon } from '@repo/contracts/plugins';
import { iconSymbols } from '#lib/generic/symbols/icon-names';
import type { SystemSymbolSource } from '#lib/generic/symbols/symbol-source';

// A platform the Plugin gives no name for draws Argo's Plugin icon.
const { sf, material } = iconSymbols.plug;

export const pluginSymbol = (icon: PluginIcon): SystemSymbolSource => ({
  sf: icon.sf ?? sf,
  material: icon.material ?? material,
});
