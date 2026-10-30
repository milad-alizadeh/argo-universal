import type { IconSize } from './icon-size';

/*
 * The one rule for a row's leading glyph (#1452).
 *
 * Colour: ADR-0026 gives `foreground` to body text and icons, so a glyph draws in that token unless its row is in a
 * tone of its own. The platform's tint — SwiftUI's accent blue on a Form row's Label, Compose's content colour —
 * never decides it, and accent fill is left to a row genuinely in an accent state. `useRowGlyphColor` resolves the
 * same token for a SwiftUI or Compose tree, which cannot hold a class.
 *
 * Size: the lane is one role, `md`, in every FieldGroup row and every kit ListItem row, which lands a title 72.7pt
 * from the screen's edge — exactly where stock iOS Settings starts one. ADR-0019: iOS list rows draw at the same
 * fixed sizes as every other icon, never at their row's text size. What the glyph draws at inside that lane is the
 * platform's own business: iOS shrinks its SF Symbol to the size stock Settings draws a mark at
 * (`appleRowSymbolPixels`), while Android and web draw a Material or Tabler glyph, already padded inside its grid,
 * at the lane itself.
 */
export const glyphForegroundClass = 'text-foreground';

/*
 * A glyph that sits in a row's leading lane rather than drawing at its own size: the lane keeps the width its role
 * gives it, so every title beside one starts on the same line, and the glyph inside it draws at what the platform's
 * own Settings app draws. Both icon paths carry it — the SwiftUI `NativeSymbol` of a FieldGroup row, and the kit's
 * `Icon` inside a ListItem's leading lane — so the two kinds of row present the same glyph.
 */
export type GlyphLane = 'row';

export const rowGlyphSize: IconSize = 'md';
