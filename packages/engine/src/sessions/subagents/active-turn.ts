import { Turn } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { desc, eq } from 'drizzle-orm';
import { latestTurnOf } from '../list/session-info';
import { readQueuedSessionRows } from '../session-storage';
import type { SubagentRouting } from './routing-types';

const latestStoredTurn = (input: SubagentRouting, sessionId: string): Turn[] =>
  input.database
    .select()
    .from(turn)
    .where(eq(turn.sessionId, sessionId))
    .orderBy(desc(turn.startedAt), desc(turn.id))
    .limit(1)
    .all()
    .map((row) => Turn.parse(row));

export function activeChildTurn(
  input: SubagentRouting,
  sessionId: string,
): string | null {
  const turns = readQueuedSessionRows(input.writer).turns(
    latestStoredTurn(input, sessionId),
  );

  const latest = latestTurnOf(turns, sessionId);

  return latest?.status === 'running' ? latest.id : null;
}
