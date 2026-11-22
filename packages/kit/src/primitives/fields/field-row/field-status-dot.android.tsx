import { Box } from '@expo/ui/jetpack-compose';
import { background, clip, size } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { toneClass, type Tone } from '#primitives/content/text';
import { usePrimitiveColor } from '#primitives/native/primitive-color';

const dotSize = 8;

// A circle the size of a status dot, in the tone's colour.
export function FieldStatusDot(props: { tone: Tone }): ReactElement {
  const color = usePrimitiveColor(toneClass(props.tone) ?? 'text-foreground');

  return (
    <Box
      modifiers={[
        size(dotSize, dotSize),
        clip({ type: 'roundedCorner', radius: dotSize / 2 }),
        background(color ?? 'transparent'),
      ]}
    />
  );
}
