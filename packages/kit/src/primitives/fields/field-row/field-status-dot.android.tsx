import { Box } from '@expo/ui/jetpack-compose';
import {
  background,
  clip,
  Shapes,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import {
  fieldStatusDotSize,
  type FieldStatusDotProps,
  useFieldStatusDotColor,
} from './field-status-dot-style';

// A circle the size of a status dot, in the tone's colour.
export function FieldStatusDot({ tone }: FieldStatusDotProps): ReactElement {
  const color = useFieldStatusDotColor(tone);

  const modifiers = [
    size(fieldStatusDotSize, fieldStatusDotSize),
    clip(Shapes.Circle),
    background(color ?? 'transparent'),
  ];

  return <Box modifiers={modifiers} />;
}
