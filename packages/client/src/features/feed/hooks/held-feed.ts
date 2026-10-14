import type { FeedSyncPoint, SessionSnapshot } from '@repo/contracts';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { createHeldCache, type HeldCache } from '#lib/generic/held-cache';
import { emptyFeed, type FeedState, syncPointOf } from '../view/feed-state';

interface HeldFeed {
  feed: FeedState;
  snapshot: SessionSnapshot | null;
}

// Long enough for one screen to take over a Session from another, as New Session hands its Session to the Session page.
export const handOverGraceMs = 2_000;

// One cache per App, so Storybook's and tests' separate Apps never share a Session.
const heldFeeds = new WeakMap<QueryClient, HeldCache<HeldFeed>>();

const heldFeedsOf = (queryClient: QueryClient): HeldCache<HeldFeed> => {
  const cache = heldFeeds.get(queryClient) ?? createHeldCache(handOverGraceMs);
  heldFeeds.set(queryClient, cache);

  return cache;
};

export interface HeldFeedStart {
  feed: FeedState;
  snapshot: SessionSnapshot | null;
  // The revision live updates resume after, per ADR-0007, when the Session was held a moment ago.
  syncPoint: FeedSyncPoint | null;
}

// A Session's Feed as the screen that held it last left it; a screen taking it over starts there instead of empty.
export function useHeldFeedStart(sessionId: string | undefined): HeldFeedStart {
  const cache = heldFeedsOf(useQueryClient());

  const start = useMemo((): HeldFeedStart => {
    const held = sessionId ? cache.read(sessionId) : undefined;

    return {
      feed: held?.feed ?? emptyFeed,
      snapshot: held?.snapshot ?? null,
      syncPoint: held ? syncPointOf(held.feed) : null,
    };
  }, [cache, sessionId]);

  useEffect(
    () => (sessionId ? cache.hold(sessionId) : undefined),
    [cache, sessionId],
  );

  return start;
}

// Keeps the Feed as this screen shows it, for the next screen to start from.
export function useKeepHeldFeed(
  sessionId: string | undefined,
  { feed, snapshot }: HeldFeed,
): void {
  const cache = heldFeedsOf(useQueryClient());
  useEffect(() => {
    if (sessionId && feed.epoch !== null)
      cache.write(sessionId, { feed, snapshot });
  }, [cache, sessionId, feed, snapshot]);
}
