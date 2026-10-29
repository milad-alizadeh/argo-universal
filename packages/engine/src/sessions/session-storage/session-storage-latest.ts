import type { Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { turn } from '@repo/db/schema';
import { inArray } from 'drizzle-orm';
import {
  decodeStoredTurn,
  latestTurnOf,
  readLatestTurnIds,
  storedTurnColumns,
} from '../turns';
import type { QueuedSessionRows } from './session-storage';

type StoredTurn = Parameters<typeof decodeStoredTurn>[0];

const latestIds = (
  database: Database,
  sessionIds: string[],
): ReturnType<typeof readLatestTurnIds> =>
  readLatestTurnIds({ database, sessionIds, updates: [], running: false });

export function storedLatestTurns(
  database: Database,
  sessionIds: string[],
): StoredTurn[] {
  return database
    .select(storedTurnColumns)
    .from(turn)
    .where(inArray(turn.id, latestIds(database, sessionIds)))
    .all();
}

export function projectedLatestTurn(
  stored: StoredTurn[],
  queued: QueuedSessionRows,
  sessionId: string,
): Turn | undefined {
  const rows = stored.flatMap((row) =>
    row.sessionId === sessionId ? [decodeStoredTurn(row)] : [],
  );

  return latestTurnOf(queued.turns(rows), sessionId);
}
