import { type FeedEndMotion, followEnd } from './feed-end-motion';
import type { ListRef } from './keep-place';

// Native scroll animations defer a new end target until the previous scroll completes.
export function useFeedEndMotion(
  _list: ListRef,
  _enabled: boolean,
): FeedEndMotion {
  return followEnd;
}
