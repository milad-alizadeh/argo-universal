import type { Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { turn } from '@repo/db/schema';
import { inArray } from 'drizzle-orm';
import type { WriterActorRef } from '../../storage';
import {
  decodeStoredTurn,
  latestTurnOf,
  readLatestTurnIds,
  storedTurnColumns,
} from '../stored-turn';
import {
  type QueuedSessionRows,
  readQueuedSessionRows,
} from './queued-session-rows';

type StoredTurn = Parameters<typeof decodeStoredTurn>[0];

const latestIds = (
  database: Database,
  sessionIds: string[],
): ReturnType<typeof readLatestTurnIds> =>
  readLatestTurnIds({ database, sessionIds, updates: [], running: false });

function storedLatestTurns(
  database: Database,
  sessionIds: string[],
): StoredTurn[] {
  return database
    .select(storedTurnColumns)
    .from(turn)
    .where(inArray(turn.id, latestIds(database, sessionIds)))
    .all();
}

function projectedLatestTurn(
  stored: StoredTurn[],
  queued: QueuedSessionRows,
  sessionId: string,
): Turn | undefined {
  const rows = stored.flatMap((row) =>
    row.sessionId === sessionId ? [decodeStoredTurn(row)] : [],
  );

  return latestTurnOf(queued.turns(rows), sessionId);
}

// Where a read finds rows: committed in the database, or queued in the Writer.
export type RowSources = {
  database: Database;
  writer: WriterActorRef | undefined;
};

// The latest Turn of each of these Sessions, read in one query; a malformed stored Turn throws only when its Session is asked for.
export function readLatestTurns(
  { database, writer }: RowSources,
  sessionIds: string[],
): (sessionId: string) => Turn | undefined {
  const stored = storedLatestTurns(database, sessionIds);
  const queued = readQueuedSessionRows(writer);

  return (sessionId): Turn | undefined =>
    projectedLatestTurn(stored, queued, sessionId);
}

// A Session's latest Turn as the Writer will leave it: the stored latest Turn with the queued Turn jobs replayed over it.
export const readLatestTurn = (
  sources: RowSources,
  sessionId: string,
): Turn | undefined => readLatestTurns(sources, [sessionId])(sessionId);
