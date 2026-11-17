import type { SystemSymbolSource } from '@repo/contracts/kit-symbols';
import type { SvgSymbolName } from './svg-symbols';

export type { SystemSymbolSource } from '@repo/contracts/kit-symbols';

// A git icon or the web chevron: one SVG component, drawn on every platform (ADR-0041), so it has no SF or Material name.
export interface SvgSymbolSource {
  svg: SvgSymbolName;
}

// A Plugin's own icon: the one-colour SVG markup the Server read from its manifest and painted in `currentColor` (ADR-0058).
export interface MarkupSymbolSource {
  markup: string;
}

export type SymbolSource =
  | SystemSymbolSource
  | SvgSymbolSource
  | MarkupSymbolSource;
