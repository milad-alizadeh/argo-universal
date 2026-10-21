import type { ViewStyle } from 'react-native';

// Native clips as a scroll container: Yoga then lays the markdown out at full height, where overflow hidden squeezes it and iOS draws part-cut lines.
export const wholeLineClip = (clipHeight: number): ViewStyle => ({
  overflow: 'scroll',
  maxHeight: clipHeight,
});
