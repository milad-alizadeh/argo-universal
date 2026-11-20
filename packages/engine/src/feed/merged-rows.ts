import type { SessionUpdate } from '@repo/contracts';
import type { WriterActorRef } from '../storage';
import { withoutVoiceMarkers } from './conversation-markers';
import type { FeedRowSources } from './feed-catch-up-rows';
import {
  hydrateStoredFeedRow,
  newestRows,
  type FeedRowWrite,
} from './feed-row';
import { readQueuedFeed } from './feed-storage';

/*
 * Rows as their readers see them: Agent messages without Conversation marks (ADR-0064). The Feed restores its own rows through
 * `hydrateStoredFeedRow`, `readQueuedFeed` and `readWrittenRow`, which keep the marks; anything that reads rows for a
 * person or another Agent reads them here.
 */

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

type FeedMemory = {
  getSnapshot: () => { context: { rows: Record<string, SessionUpdate> } };
};

// A stored row as it is read; a row that fails hydration throws.
export const readStoredFeedRow = (
  sessionId: string,
  row: FeedRowWrite,
): SessionUpdate => withoutVoiceMarkers(hydrateStoredFeedRow(sessionId, row));

// The rows of one Session the Writer holds but has not committed, as they are read.
export const readQueuedRows = (
  writer: WriterActorRef | undefined,
  sessionId: string,
): SessionUpdate[] =>
  readQueuedFeed(writer, sessionId).rows.map(withoutVoiceMarkers);

// The rows a Feed actor holds in memory, as they are read.
export const readFeedMemory = (feed: FeedMemory | undefined): SessionUpdate[] =>
  Object.values(feed?.getSnapshot().context.rows ?? {}).map(
    withoutVoiceMarkers,
  );

// The newest copy of each kept row across stored, queued and live: the higher revision wins (ADR-0007).
export function readFeedRows<Kept extends SessionUpdate>(
  sources: Pick<FeedRowSources, 'findFeed' | 'findWriter'>,
  sessionId: string,
  { stored, keep }: FeedRowsRead<Kept>,
): ReadRows<Kept> {
  const hydrated = hydrateRows(sessionId, stored);
  const queued = readQueuedRows(sources.findWriter(), sessionId);
  const live = readFeedMemory(sources.findFeed(sessionId));
  const rows = [...hydrated.rows, ...queued, ...live];

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
      return [readStoredFeedRow(sessionId, row)];
    } catch (error) {
      rejected.push(error);

      return [];
    }
  });

  return { rows, rejected };
}
