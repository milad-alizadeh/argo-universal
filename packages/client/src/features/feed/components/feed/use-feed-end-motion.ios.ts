import { useReducedMotionNow } from '@repo/kit/use-reduced-motion-now';
import { type FeedEndMotion, followEnd } from './feed-end-motion';
import type { ListRef } from './keep-place';

// Follow new keys even when their size matches the estimate. Later text growth follows its measured layout.
const animatedFollowEnd: FeedEndMotion = {
  animated: true,
  on: { layout: true, footerLayout: true, dataAppend: true, itemLayout: true },
};

export function useFeedEndMotion(
  _list: ListRef,
  _enabled: boolean,
  followsLiveRows: boolean,
): FeedEndMotion {
  const reduced = useReducedMotionNow();

  return followsLiveRows && !reduced ? animatedFollowEnd : followEnd;
}
