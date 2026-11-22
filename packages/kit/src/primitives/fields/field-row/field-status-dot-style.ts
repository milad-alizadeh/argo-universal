import { toneClass, type Tone } from '#primitives/content/text';
import { usePrimitiveColor } from '#primitives/native/primitive-color';

export const fieldStatusDotSize = 8;

export type FieldStatusDotProps = { tone: Tone };

export const useFieldStatusDotColor = (
  tone: Tone,
): ReturnType<typeof usePrimitiveColor> =>
  usePrimitiveColor(toneClass(tone) ?? 'text-foreground');
