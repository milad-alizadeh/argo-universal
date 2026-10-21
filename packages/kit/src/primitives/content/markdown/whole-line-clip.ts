import type { ViewStyle } from 'react-native';

// The web clips the clamped markdown at the cut.
export const wholeLineClip = (clipHeight: number): ViewStyle => ({
  overflow: 'hidden',
  maxHeight: clipHeight,
});
