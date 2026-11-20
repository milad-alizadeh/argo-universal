import type { LegendListRef } from '@legendapp/list/react-native';
import { useLayoutEffect } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { type FeedEndMotion, followEnd } from './feed-end-motion';
import { WebFeedGlide } from './follow-web-feed';
import type { ListRef } from './keep-place';

/*
 * Legend retains gesture ownership and handles changes to the viewport and Composer.
 * One frame loop follows incoming row measurements, even when the destination moves.
 */
const followRows = { on: { layout: true, footerLayout: true } };

function watchRows(list: LegendListRef, glide: WebFeedGlide): () => void {
  const state = list.getState();

  const follow = (): void => {
    if (list.getState().isFollowingEnd) glide.start();
  };

  const release = state.listen('isFollowingEnd', (following) => {
    if (!following) glide.stop();
  });

  const resize = state.listen('totalSize', follow);

  return () => {
    resize();
    release();
    glide.stop();
  };
}

function watchFeed(list: LegendListRef): (() => void) | undefined {
  const node: unknown = list.getScrollableNode();

  return node instanceof HTMLElement
    ? watchRows(list, new WebFeedGlide(node))
    : undefined;
}

function useWatchFeed(list: ListRef, animated: boolean): FeedEndMotion {
  useLayoutEffect(() => {
    if (!animated || !list.current) return;

    return watchFeed(list.current);
  }, [animated, list]);

  return animated ? followRows : followEnd;
}

export function useFeedEndMotion(
  list: ListRef,
  enabled: boolean,
): FeedEndMotion {
  const reduced = useReducedMotion();

  return useWatchFeed(list, enabled && !reduced);
}
