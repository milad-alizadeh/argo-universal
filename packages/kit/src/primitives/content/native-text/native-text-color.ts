import type { Tone } from '#primitives/content/text';
import { toneClass } from '#primitives/content/text';
import { usePrimitiveColor } from '#primitives/native/primitive-color';

// Explicit text tones use public colour props (Compose's, SwiftUI's foreground); untoned text inherits its native container.
export function useTextColor(tone: Tone | undefined): string | undefined {
  const color = usePrimitiveColor(toneClass(tone) ?? 'text-foreground');

  return tone === undefined ? undefined : color;
}
