import { Platform } from 'react-native';
import {
  type FeedEndMotion,
  followEnd,
  followViewport,
} from './feed-end-motion';
import type { ListRef } from './keep-place';

// Android's scroll view anchors row changes during layout. Legend follows changes to the viewport and Composer.
export function useFeedEndMotion(
  _list: ListRef,
  _enabled: boolean,
): FeedEndMotion {
  return Platform.OS === 'android' ? followViewport : followEnd;
}
