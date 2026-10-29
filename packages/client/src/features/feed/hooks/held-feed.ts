import type { FeedSyncPoint, SessionSnapshot } from '@repo/contracts';
import { createHeldCache, type HeldCache } from '@repo/kit/held-cache';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { emptyFeed, type FeedState, syncPointOf } from '../view/feed-state';

interface HeldFeed {
  feed: FeedState;
  snapshot: SessionSnapshot | null;
}

// Long enough that switching back to a Session shows it at once while its live subscription catches up.
export const revisitGraceMs = 600_000;

const revisitMaxSessions = 12;

// One cache per App, so Storybook's and tests' separate Apps never share a Session.
const heldFeeds = new WeakMap<QueryClient, HeldCache<HeldFeed>>();

const heldFeedsOf = (queryClient: QueryClient): HeldCache<HeldFeed> => {
  const cache =
    heldFeeds.get(queryClient) ??
    createHeldCache({ graceMs: revisitGraceMs, maxIdle: revisitMaxSessions });

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

  const start = useMemo(
    () => heldFeedStart(cache, sessionId),
    [cache, sessionId],
  );

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

function heldFeedStart(
  cache: HeldCache<HeldFeed>,
  sessionId: string | undefined,
): HeldFeedStart {
  const held = sessionId ? cache.read(sessionId) : undefined;

  return held
    ? {
        feed: held.feed,
        snapshot: held.snapshot,
        syncPoint: syncPointOf(held.feed),
      }
    : { feed: emptyFeed, snapshot: null, syncPoint: null };
}
