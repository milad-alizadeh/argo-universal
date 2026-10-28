import type { BlobRef, SessionUpdate, ToolCallUpdate } from '@repo/contracts';
import type { OperationWorkTarget } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { readFeedRow } from '../../feed';
import type { SessionRouterDeps } from '../router-deps';
import { requireLiveSessionActor } from '../session-system';
import { operationRowId } from './rows';

export type CallSources = Pick<
  SessionRouterDeps,
  'database' | 'findWriter' | 'findFeed' | 'readSession' | 'sessions'
>;

// An Operation Tool call read back from its Feed row, with the native work it started.
export type OperationCallRead = {
  status: 'settled' | 'still_running' | 'waiting_for_user';
  result?: Json;
  fullResult?: BlobRef;
  error?: string;
  cancelled?: true;
  work?: OperationWorkTarget;
};

type ArgoMeta = NonNullable<ToolCallUpdate['_meta']>['argo'];

export function readOperationCall(
  deps: CallSources,
  sessionId: string,
  toolCallId: string,
): OperationCallRead {
  const row = requireCallRow(
    readFeedRow(deps, { sessionId, id: operationRowId(toolCallId) }),
    toolCallId,
  );

  const state = rowState(deps, sessionId, row);
  const work = startedWork(row);

  if (work) state.work = work;

  return state;
}

function requireCallRow(
  row: SessionUpdate,
  toolCallId: string,
): ToolCallUpdate {
  if (row.sessionUpdate === 'tool_call_update' && row.toolCallId === toolCallId)
    return row;

  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'The Operation Tool call no longer exists',
  });
}

const argoMeta = (row: ToolCallUpdate): ArgoMeta => row._meta?.argo;

const fullResult = (row: ToolCallUpdate): BlobRef | undefined =>
  argoMeta(row)?.fullOutput?.rawOutput;

const startedWork = (row: ToolCallUpdate): OperationWorkTarget | undefined =>
  argoMeta(row)?.operationWork;

function rowState(
  deps: CallSources,
  sessionId: string,
  row: ToolCallUpdate,
): OperationCallRead {
  if (row.state === 'settled') return settledState(row);

  const session = requireLiveSessionActor(deps.sessions.system, sessionId);

  const waiting = session
    .getSnapshot()
    .context.permissionQueue.some(
      (request) => request.toolCallId === row.toolCallId,
    );

  return { status: waiting ? 'waiting_for_user' : 'still_running' };
}

function settledState(row: ToolCallUpdate): OperationCallRead {
  if (row.status === 'cancelled') return { status: 'settled', cancelled: true };

  if (row.status === 'failed')
    return { status: 'settled', error: failedMessage(row) };

  return { status: 'settled', ...completedOutput(row) };
}

function completedOutput(
  row: ToolCallUpdate,
): Pick<OperationCallRead, 'result' | 'fullResult'> {
  return {
    result: z.json().parse(row.rawOutput ?? null),
    fullResult: fullResult(row),
  };
}

function failedMessage(row: ToolCallUpdate): string {
  const result = z.object({ error: z.string() }).safeParse(row.rawOutput);

  return result.success ? result.data.error : 'The Operation failed';
}
