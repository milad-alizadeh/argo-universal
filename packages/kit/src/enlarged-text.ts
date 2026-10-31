import { useWindowDimensions } from 'react-native';

/*
 * Whether the person has made text bigger than the default: iOS's Dynamic Type size or Android's font scale. A
 * one-line row keeps to one line at the default size (ADR-0042) but wraps once the text grows, as stock Settings
 * does, since a capped line at the largest sizes cuts a title to a few letters.
 */
export function useEnlargedText(): boolean {
  return useWindowDimensions().fontScale > 1;
}
