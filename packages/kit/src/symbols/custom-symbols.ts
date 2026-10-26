import type { SFSymbol } from 'expo-symbols';
import customSymbols from './custom-symbol-paths.json';
import type { SymbolPath } from './symbol-path';

/*
 * Argo's own SF Symbols, for icons SF Symbols lacks (ADR-0019). Each path is the Regular-M glyph of an SF Symbols
 * template, relative to its baseline and centred on its advance. The Expo plugin `with-custom-symbols` writes them
 * into the iOS asset catalog, and the desktop app on macOS draws them from here; elsewhere they draw Material names.
 */
export type CustomSymbol = keyof typeof customSymbols;

export type AppleSymbol = SFSymbol | CustomSymbol;

export function isCustomSymbol(name: string): name is CustomSymbol {
  return Object.hasOwn(customSymbols, name);
}

export function customSymbolPath(name: CustomSymbol): SymbolPath {
  return customSymbols[name];
}
