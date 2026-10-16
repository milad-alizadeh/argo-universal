import type { SymbolPath } from './symbol-path';
import tablerSymbols from './tabler-symbol-paths.json';

/*
 * The git icons, Tabler Icons (MIT, assets/tabler), which every platform draws from these paths (ADR-0019).
 * `tools/sf-symbols/tabler-symbols` writes them in the custom symbols' units and box, keyed by their asset-catalog
 * names, which `with-custom-symbols` gives the iOS app.
 */
export type TablerAsset = keyof typeof tablerSymbols;

type WithoutPrefix<Asset> = Asset extends `custom.${infer Name}` ? Name : never;

// A Tabler icon's own name, as its source SVG is named.
export type TablerSymbol = WithoutPrefix<TablerAsset>;

export function tablerAsset(name: TablerSymbol): TablerAsset {
  return `custom.${name}`;
}

export function tablerSymbolPath(name: TablerSymbol): SymbolPath {
  return tablerSymbols[tablerAsset(name)];
}
