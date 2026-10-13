import type {
  FeedPageInput,
  FeedPageOutput,
  SessionUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, lt } from 'drizzle-orm';
import type { FeedDeps } from './feed';
import {
  hydrateStoredFeedRow,
  storedFeedColumns,
  type FeedRowWrite,
} from './feed-row';

const isStaleCursor = (input: FeedPageInput, epoch: number): boolean =>
  input.epoch !== undefined && input.epoch !== epoch;

const pageCursor = (
  input: FeedPageInput,
  epoch: number,
): number | undefined => {
  if (isStaleCursor(input, epoch)) return undefined;

  return input.direction === 'before' ? input.cursor : undefined;
};

function readPageRows(
  database: Database,
  input: FeedPageInput,
  cursor: number | undefined,
): FeedRowWrite[] {
  const before =
    cursor === undefined ? undefined : lt(feedRow.position, cursor);

  return database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, input.sessionId), before))
    .orderBy(desc(feedRow.position))
    .limit(input.limit + 1)
    .all();
}

const hydratePageRows = (
  stored: FeedRowWrite[],
  input: FeedPageInput,
): SessionUpdate[] =>
  stored
    .slice(0, input.limit)
    .reverse()
    .map((row): SessionUpdate => hydrateStoredFeedRow(input.sessionId, row));

function pageContent(
  stored: FeedRowWrite[],
  input: FeedPageInput,
): Pick<FeedPageOutput, 'rows' | 'hasOlder' | 'startCursor'> {
  const rows = hydratePageRows(stored, input);

  return {
    rows,
    hasOlder: stored.length > input.limit,
    startCursor: rows[0]?.position ?? null,
  };
}

export function readFeedPage(
  { database, readSession }: Pick<FeedDeps, 'database' | 'readSession'>,
  input: FeedPageInput,
): FeedPageOutput {
  const { epoch, maxRevision } = readSession(input.sessionId);
  const cursor = pageCursor(input, epoch);
  const stored = readPageRows(database, input, cursor);

  return {
    epoch,
    maxRevision,
    ...pageContent(stored, input),
    staleCursor: isStaleCursor(input, epoch),
  };
}
