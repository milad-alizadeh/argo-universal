import type { SFSymbol } from 'expo-symbols';
import appleOnlySymbols from './custom-symbol-paths.json';
import tablerSymbols from './tabler-symbol-paths.json';

/*
 * Argo's own symbols (ADR-0019). Each path is the Regular-M glyph of an SF Symbols template, relative to its baseline
 * and centred on its advance; the viewBox is the 16-point symbol box. The Expo plugin `with-custom-symbols` writes
 * them all into the iOS asset catalog, and the desktop app on macOS draws them from here.
 *
 * `custom-symbol-paths.json` holds icons SF Symbols lacks; elsewhere they draw Material names. `tabler-symbol-paths.json`
 * holds the git icons, Tabler Icons (MIT, assets/tabler), which every platform draws from their paths.
 */
const symbols = { ...appleOnlySymbols, ...tablerSymbols };

type CustomSymbol = keyof typeof symbols;

export type TablerSymbol = keyof typeof tablerSymbols;

export type AppleSymbol = SFSymbol | CustomSymbol;

interface SymbolBox {
  width: number;
  height: number;
}

// SF Symbols draw like text: every symbol in a role at the size that makes `circle` fill this share of the role's box.
export const referenceShare = 0.88;

// `circle` is this wide in 100-point type, the units of the custom symbol paths.
const referenceSymbolCustomUnits = 117;

export function isCustomSymbol(name: string): name is CustomSymbol {
  return Object.hasOwn(symbols, name);
}

export function isTablerSymbol(name: string): name is TablerSymbol {
  return Object.hasOwn(tablerSymbols, name);
}

// The symbol box in the paths' units, 100-point type, where the system `circle` symbol is 117 points wide.
function customSymbolBox(name: CustomSymbol): SymbolBox {
  const [, , width = 0, height = 0] = symbols[name].viewBox
    .split(' ')
    .map(Number);

  return { width, height };
}

// The symbol box drawn in an icon box of `pixels`, sized as the system symbols are; a box larger than `circle` shrinks to it.
export function customSymbolSize(
  name: CustomSymbol,
  pixels: number,
): SymbolBox {
  const box = customSymbolBox(name);

  const scale =
    (pixels * referenceShare) /
    Math.max(referenceSymbolCustomUnits, box.width, box.height);

  return { width: box.width * scale, height: box.height * scale };
}

interface SymbolPath {
  viewBox: string;
  d: string;
}

export function customSymbolPath(name: CustomSymbol): SymbolPath {
  return symbols[name];
}

// The symbol as an SVG data URL, for the page to use as a mask like the system symbols' PNGs.
export function customSymbolImage(name: CustomSymbol): string {
  const { viewBox, d } = customSymbolPath(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
