import type { PluginIcon } from '@repo/contracts/plugins';
import type { ManifestIcon } from '@repo/contracts/plugins/manifest-fields';
import { iconSymbols } from '@repo/kit/symbols/icon-names';
import type { DrawnIcon } from '@repo/kit/symbols/icon-symbol';
import type { SystemSymbolSource } from '@repo/kit/symbols/symbol-source';

// A Plugin may target only Apple or only Material platforms; the others still need a glyph in its Rail tile and drawer row.
export const pluginSymbol = (icon: PluginIcon): SystemSymbolSource => ({
  ...iconSymbols.plug,
  ...icon,
});

/*
 * A Plugin's manifest icon: its own SVG, which the Server made one colour (ADR-0058), and otherwise its symbol names.
 * Where only a system symbol can draw, such as a native menu, the markup draws nothing, so the names stay the fallback.
 */
export function manifestIcon(icon: ManifestIcon, markup?: string): DrawnIcon {
  const { svg, ...names } = icon;

  return markup === undefined || svg === undefined
    ? pluginSymbol(names)
    : { markup };
}
