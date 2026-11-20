import { type FeedEndMotion, followEnd } from './feed-end-motion';
import type { ListRef } from './keep-place';

export function useFeedEndMotion(
  _list: ListRef,
  _enabled: boolean,
): FeedEndMotion {
  return followEnd;
}
