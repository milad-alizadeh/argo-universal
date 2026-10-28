import type { Turn, ToolCallUpdate } from '@repo/contracts';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { turn } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { readFeedRow } from '../feed';
import type { SessionRouterDeps } from './router-deps';
import { readQueuedSessionRows } from './session-storage';
import { requireLiveSessionActor } from './session-system';
import { decodeStoredTurn, storedTurnColumns } from './turns';

type Sources = Pick<
  SessionRouterDeps,
  'database' | 'findWriter' | 'findFeed' | 'readSession' | 'sessions'
>;

type SessionOperationWork = {
  status: 'settled' | 'still_running' | 'waiting_for_user';
  result?: Json;
  error?: string;
  cancelled?: true;
};

// Reads the exact admitted Turn, including updates the Writer has not committed yet.
export function readSessionTurn(
  deps: Sources,
  sessionId: string,
  turnId: string,
): Turn {
  const stored = deps.database
    .select(storedTurnColumns)
    .from(turn)
    .where(eq(turn.id, turnId))
    .get();

  const queued = readQueuedSessionRows(deps.findWriter());

  const row = queued
    .turns(stored ? [decodeStoredTurn(stored)] : [])
    .find((item) => item.id === turnId && item.sessionId === sessionId);

  if (row) return row;
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'The Turn no longer exists',
  });
}

export function readSessionOperation(
  deps: Sources,
  sessionId: string,
  toolCallId: string,
): SessionOperationWork {
  const row = readFeedRow(deps, { sessionId, id: `argo:${toolCallId}` });

  if (row.sessionUpdate !== 'tool_call_update' || row.toolCallId !== toolCallId)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'The Operation Tool call no longer exists',
    });

  if (row.state === 'settled') {
    if (row.status === 'cancelled')
      return { status: 'settled', cancelled: true };

    if (row.status === 'failed')
      return { status: 'settled', error: failedMessage(row) };

    return {
      status: 'settled',
      result: z.json().parse(row.rawOutput ?? null),
    };
  }

  const session = requireLiveSessionActor(deps.sessions.system, sessionId);

  const waiting = session
    .getSnapshot()
    .context.permissionQueue.some(
      (request) => request.toolCallId === toolCallId,
    );

  return { status: waiting ? 'waiting_for_user' : 'still_running' };
}

function failedMessage(row: ToolCallUpdate): string {
  const result = z.object({ error: z.string() }).safeParse(row.rawOutput);

  return result.success ? result.data.error : 'The Operation failed';
}
