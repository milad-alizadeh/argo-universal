import type { FeedSubscribeOutput, SessionUpdate } from '@repo/contracts';
import type { QueryClient } from '@tanstack/react-query';
import { upsertRow } from '../view/feed-row-events';
import {
  applySubscriptionEvent,
  emptyFeed,
  type FeedState,
} from '../view/feed-state';
import { feedKey, snapshotKey } from './feed-query';

// Where a Session's Feed is written, and how a row is fetched whole.
export interface FeedWrites {
  queryClient: QueryClient;
  cacheId: string;
  fetchRow: (id: string) => Promise<SessionUpdate>;
}

type Held = Exclude<FeedSubscribeOutput, { type: 'closed' }>;

// Writes what one frame of live changes did to a Session's Feed: one write for its rows, whatever their number.
export function applyFeedEvents(
  { queryClient, cacheId, fetchRow }: FeedWrites,
  events: readonly Held[],
): void {
  const snapshot = events.findLast((event) => event.type === 'snapshot');
  const changes = events.filter((event) => event.type !== 'snapshot');

  if (snapshot)
    queryClient.setQueryData(snapshotKey(cacheId), snapshot.snapshot);

  if (changes.length === 0) return;

  // The Server rebuilt the Feed: what is held goes, and the tail pages again.
  if (changes.some((event) => event.type === 'reset'))
    void queryClient.resetQueries({ queryKey: feedKey(cacheId), exact: true });

  const missing: string[] = [];

  queryClient.setQueryData<FeedState>(feedKey(cacheId), (held = emptyFeed) =>
    changes.reduce((feed, event) => {
      const result = applySubscriptionEvent(feed, event);

      if (result.missingRowId) missing.push(result.missingRowId);

      return result.feed;
    }, held),
  );

  for (const id of missing) void mergeWhole(queryClient, cacheId, fetchRow(id));
}

// The row keeps its last revision until a later change fetches it again.
async function mergeWhole(
  queryClient: QueryClient,
  cacheId: string,
  fetching: Promise<SessionUpdate>,
): Promise<void> {
  try {
    const row = await fetching;

    queryClient.setQueryData<FeedState>(feedKey(cacheId), (held = emptyFeed) =>
      upsertRow(held, row),
    );
  } catch {
    // Left as it was.
  }
}
