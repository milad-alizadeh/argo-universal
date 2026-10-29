import type { Turn } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import type { OpenSessions } from './open-sessions';
import { pendingInputRequest } from './pending-input';
import { readQueuedSessionRows } from './session-storage';
import { decodeStoredTurn, storedTurnColumns } from './stored-turn';

function readStoredTurn(
  deps: OpenSessions,
  turnId: string,
): Parameters<typeof decodeStoredTurn>[0] | undefined {
  return deps.database
    .select(storedTurnColumns)
    .from(turn)
    .where(eq(turn.id, turnId))
    .get();
}

function missingTurn(): TRPCError {
  return new TRPCError({
    code: 'NOT_FOUND',
    message: 'The Turn no longer exists',
  });
}

// Reads the exact admitted Turn, including updates the Writer has not committed yet.
export function readSessionTurn(
  deps: OpenSessions,
  sessionId: string,
  turnId: string,
): Turn {
  const stored = readStoredTurn(deps, turnId);

  const queued = readQueuedSessionRows(deps.findWriter());

  const row = queued
    .turns(stored ? [decodeStoredTurn(stored)] : [])
    .find((item) => item.id === turnId && item.sessionId === sessionId);

  if (row) return row;
  throw missingTurn();
}

export function sessionTurnRequiresInput(
  open: OpenSessions,
  sessionId: string,
  turnId: string,
): boolean {
  const live = open.context(sessionId);

  if (!live || live.activeTurnId !== turnId) return false;

  return pendingInputRequest(live) !== null;
}
