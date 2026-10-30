import type { IconSize } from './icon-size';

/*
 * The one rule for a row's leading glyph (#1452).
 *
 * Colour: ADR-0026 gives `foreground` to body text and icons, so a glyph draws in that token unless its row is in a
 * tone of its own. The platform's tint — SwiftUI's accent blue on a Form row's Label, Compose's content colour —
 * never decides it, and accent fill is left to a row genuinely in an accent state. `useRowGlyphColor` resolves the
 * same token for a SwiftUI or Compose tree, which cannot hold a class.
 *
 * Size: one role, `md`, in every FieldGroup row and every kit ListItem row. ADR-0019: iOS list rows draw at the same
 * fixed sizes as every other icon, never at their row's text size.
 */
export const glyphForegroundClass = 'text-foreground';

export const rowGlyphSize: IconSize = 'md';
