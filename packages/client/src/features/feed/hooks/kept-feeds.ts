import { createHeldCache, type HeldCache } from '@repo/kit/held-cache';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { KeptFeed, KeptFeedSlot } from '../stores';
import { emptyFeed } from '../view/feed-state';

// Long enough that switching back to a Session shows it at once while its live subscription catches up.
export const revisitGraceMs = 600_000;

const revisitMaxSessions = 12;

// One cache per App, so Storybook's and tests' separate Apps never share a Session.
const keptFeeds = new WeakMap<QueryClient, HeldCache<KeptFeed>>();

const keptFeedsOf = (queryClient: QueryClient): HeldCache<KeptFeed> => {
  const cache =
    keptFeeds.get(queryClient) ??
    createHeldCache({ graceMs: revisitGraceMs, maxIdle: revisitMaxSessions });

  keptFeeds.set(queryClient, cache);

  return cache;
};

// No Session starts empty and keeps nothing.
const noSlot: KeptFeedSlot = {
  read: () => ({ feed: emptyFeed, snapshot: null }),
  retain: () => () => {},
  write: () => {},
};

export function useKeptFeedSlot(sessionId: string | undefined): KeptFeedSlot {
  const cache = keptFeedsOf(useQueryClient());

  return useMemo(
    () => (sessionId ? slotOf(cache, sessionId) : noSlot),
    [cache, sessionId],
  );
}

const slotOf = (
  cache: HeldCache<KeptFeed>,
  sessionId: string,
): KeptFeedSlot => ({
  read: () => cache.read(sessionId),
  retain: () => cache.hold(sessionId),
  write: (kept) => cache.write(sessionId, kept),
});
