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

// A manifest icon where only a symbol draws, such as a Settings row: its names, never the path of its SVG file.
export function manifestSymbol(icon: ManifestIcon): SystemSymbolSource {
  const { svg, ...names } = icon;

  return pluginSymbol(svg === undefined ? icon : names);
}

/*
 * A Plugin's manifest icon in the rail and the drawer: its own SVG, which the Server made one colour (ADR-0058), and
 * otherwise its symbol names, which every place that draws only a system symbol keeps using.
 */
export const manifestIcon = (icon: ManifestIcon, markup?: string): DrawnIcon =>
  markup === undefined || icon.svg === undefined
    ? manifestSymbol(icon)
    : { markup };
