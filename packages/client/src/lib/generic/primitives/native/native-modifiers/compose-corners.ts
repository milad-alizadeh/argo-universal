import * as Compose from '@expo/ui/jetpack-compose';
import * as ComposeModifiers from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps } from 'react';

// The outline a Material Surface or Button draws its container in.
type ContainerOutline = NonNullable<
  ComponentProps<typeof Compose.Surface>['shape']
>;

type CornerClip = ReturnType<typeof ComposeModifiers.clip>;

// Clips a Compose node to corners of one radius.
export function roundedClip(radius: number): CornerClip {
  return ComposeModifiers.clip(ComposeModifiers.Shapes.RoundedCorner(radius));
}

// A container outline with every corner at one radius.
export function roundedOutline(radius: number): ContainerOutline {
  return Compose.Shape.RoundedCorner({
    cornerRadii: {
      topStart: radius,
      topEnd: radius,
      bottomStart: radius,
      bottomEnd: radius,
    },
  });
}
