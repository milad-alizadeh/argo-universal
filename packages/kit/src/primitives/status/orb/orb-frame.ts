import type { SkImage } from '@shopify/react-native-skia';

// Draws the orb as it looks a number of milliseconds into its animation, into `previous` when given.
export type OrbFrame = (
  milliseconds: number,
  previous: SkImage | null,
) => SkImage;
