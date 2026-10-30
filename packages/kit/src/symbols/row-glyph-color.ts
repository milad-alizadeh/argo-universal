import { useNativeTheme } from '#kit/native-theme';
import type { Tone } from '#primitives/content/text';

/*
 * The token a native row's leading glyph draws in (see glyph-tone.ts): `foreground`, resolved for a SwiftUI or
 * Compose tree, which cannot hold a class. A row in the destructive tone colours its glyph with its title.
 */
export function useRowGlyphColor(tone: Tone | undefined): string | undefined {
  const { foreground, danger } = useNativeTheme().colors;

  return tone === 'danger' ? danger : foreground;
}
