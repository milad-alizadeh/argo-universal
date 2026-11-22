import { Circle } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  foregroundStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { toneClass, type Tone } from '#primitives/content/text';
import { usePrimitiveColor } from '#primitives/native/primitive-color';

const dotSize = 8;

// A filled circle, drawn at the size of a status dot, in the tone's colour.
export function FieldStatusDot(props: { tone: Tone }): ReactElement {
  const color = usePrimitiveColor(toneClass(props.tone) ?? 'text-foreground');

  return (
    <Circle
      modifiers={[
        frame({ width: dotSize, height: dotSize }),
        foregroundStyle(color ?? 'clear'),
        accessibilityHidden(),
      ]}
    />
  );
}
