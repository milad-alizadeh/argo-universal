import { createHeldCache, type HeldCache } from '@repo/kit/held-cache';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { HeldFeed, HeldSlot } from '../stores';
import { emptyFeed } from '../view/feed-state';

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

// No Session starts empty and keeps nothing.
const noSlot: HeldSlot = {
  read: () => ({ feed: emptyFeed, snapshot: null }),
  hold: () => () => {},
  write: () => {},
};

// The Session's Feed as the screen that showed it last left it, for this screen to start from and keep.
export function useHeldSlot(sessionId: string | undefined): HeldSlot {
  const cache = heldFeedsOf(useQueryClient());

  return useMemo(
    () => (sessionId ? slotOf(cache, sessionId) : noSlot),
    [cache, sessionId],
  );
}

const slotOf = (cache: HeldCache<HeldFeed>, sessionId: string): HeldSlot => ({
  read: () => cache.read(sessionId),
  hold: () => cache.hold(sessionId),
  write: (held) => cache.write(sessionId, held),
});
