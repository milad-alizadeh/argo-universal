import type { Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { turn } from '@repo/db/schema';
import { desc, eq } from 'drizzle-orm';
import { storedTurnColumns } from './list-turn-columns';
import { decodeStoredTurn } from './stored-turn';

export function readLatestTurn(database: Database, sessionId: string): Turn[] {
  return database
    .select(storedTurnColumns)
    .from(turn)
    .where(eq(turn.sessionId, sessionId))
    .orderBy(desc(turn.startedAt), desc(turn.id))
    .limit(1)
    .all()
    .map(decodeStoredTurn);
}
