import { Circle } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  foregroundStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import {
  fieldStatusDotSize,
  type FieldStatusDotProps,
  useFieldStatusDotColor,
} from './field-status-dot-style';

// A filled circle, drawn at the size of a status dot, in the tone's colour.
export function FieldStatusDot({ tone }: FieldStatusDotProps): ReactElement {
  const color = useFieldStatusDotColor(tone);

  return (
    <Circle
      modifiers={[
        frame({ width: fieldStatusDotSize, height: fieldStatusDotSize }),
        foregroundStyle(color ?? 'clear'),
        accessibilityHidden(),
      ]}
    />
  );
}
