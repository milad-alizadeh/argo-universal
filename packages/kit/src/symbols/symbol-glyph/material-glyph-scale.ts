/*
 * One multiple for every Material symbol, so a glyph's size is the component's to decide and no symbol
 * carries a number of its own. Material draws each glyph on a 24-unit grid with its padding inside it, which
 * is the size Android's own app bars and iOS's toolbars draw it at; fitting each one to its ink instead meant
 * a measured extent per symbol, and a symbol nobody had measured drew at the wrong size in silence (owner,
 * 2026-10-21).
 */
export const materialGlyphScale = 1.125;
