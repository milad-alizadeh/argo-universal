import type { SFSymbol } from 'expo-symbols';
import symbols from './custom-symbol-paths.json';

/*
 * Argo's own symbols for icons SF Symbols lacks (ADR-0019). Each path is the Regular-M glyph of an SF Symbols template,
 * relative to its baseline and centred on its advance; the viewBox is the 16-point symbol box. The Expo plugin
 * `with-custom-symbols` writes them into the iOS asset catalog, and the desktop app on macOS draws them from here.
 */
type CustomSymbol = keyof typeof symbols;

export type AppleSymbol = SFSymbol | CustomSymbol;

export function isCustomSymbol(name: string): name is CustomSymbol {
  return Object.hasOwn(symbols, name);
}

// The symbol as an SVG data URL, for the page to use as a mask like the system symbols' PNGs.
export function customSymbolImage(name: CustomSymbol): string {
  const { viewBox, d } = symbols[name];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
