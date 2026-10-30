import type { ViewProps } from 'react-native';

/*
 * A drawn symbol is decoration, never a stop of its own (#1505).
 *
 * The row, button or header around a glyph names itself, so the glyph adds nothing a screen reader can use: left
 * exposed on iOS it reads the symbol's own name — `conversation`, `gearshape`, `powerplug`, and for one SF Symbol
 * the flatly wrong `Screen Recording` — doubling the stops in every list. The web has always drawn its glyph
 * `aria-hidden` (symbol-glyph.web.tsx) and Android's Material drawing exposes no node, so this is what the two
 * already do, said once for every platform.
 *
 * A glyph that is the only thing a control draws is named by that control — IconButton's `accessibilityLabel`,
 * a Label's title — and a logo keeps its brand's name, since that name is the content (logo-glyph.tsx).
 */
export const decorativeGlyph = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const satisfies ViewProps;
