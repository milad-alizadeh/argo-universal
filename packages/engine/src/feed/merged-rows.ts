import type { SessionUpdate } from '@repo/contracts';
import type { FeedRowSources } from './feed-catch-up-rows';
import {
  hydrateStoredFeedRow,
  newestRows,
  type FeedRowWrite,
} from './feed-row';
import { readQueuedFeed } from './feed-storage';

type FeedRowsRead<Kept extends SessionUpdate> = {
  // The rows the caller read from `feed_row`, not yet hydrated.
  stored: readonly FeedRowWrite[];
  keep: (row: SessionUpdate) => row is Kept;
};

type ReadRows<Row extends SessionUpdate> = {
  rows: Row[];
  // Why each stored row that failed hydration was left out.
  rejected: unknown[];
};

// The newest copy of each kept row across stored, queued and live: the higher revision wins (ADR-0007).
export function readFeedRows<Kept extends SessionUpdate>(
  sources: Pick<FeedRowSources, 'findFeed' | 'findWriter'>,
  sessionId: string,
  { stored, keep }: FeedRowsRead<Kept>,
): ReadRows<Kept> {
  const hydrated = hydrateRows(sessionId, stored);
  const queued = readQueuedFeed(sources.findWriter(), sessionId).rows;
  const live = sources.findFeed(sessionId)?.getSnapshot().context.rows ?? {};
  const rows = [...hydrated.rows, ...queued, ...Object.values(live)];

  return {
    rows: [...newestRows(rows).values()].filter(keep),
    rejected: hydrated.rejected,
  };
}

function hydrateRows(
  sessionId: string,
  stored: readonly FeedRowWrite[],
): ReadRows<SessionUpdate> {
  const rejected: unknown[] = [];

  const rows = stored.flatMap((row): SessionUpdate[] => {
    try {
      return [hydrateStoredFeedRow(sessionId, row)];
    } catch (error) {
      rejected.push(error);

      return [];
    }
  });

  return { rows, rejected };
}
