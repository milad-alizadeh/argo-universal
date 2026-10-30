import type { BlobRef, SessionUpdate, ToolCallUpdate } from '@repo/contracts';
import type { OperationWorkTarget } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { readFeedRow } from '../../feed';
import type { HandlerSources } from '../session-sources';
import { CallingSession } from './calling-session';
import { operationRowId } from './rows';

type CallSources = HandlerSources<
  'database' | 'readSession' | 'findFeed' | 'findWriter',
  'live'
>;

// Where an Operation Tool call is: running, waiting for the user's answer, or settled one of three ways.
type CallState =
  | { status: 'still_running' }
  | { status: 'waiting_for_user' }
  | { status: 'completed'; result: Json; fullResult?: BlobRef }
  | { status: 'failed'; error: string }
  | { status: 'cancelled' };

// An Operation Tool call read back from its Feed row, with the native work it started.
export type OperationCallRead = CallState & { work?: OperationWorkTarget };

type ArgoMeta = NonNullable<ToolCallUpdate['_meta']>['argo'];

export function readOperationCall(
  sources: CallSources,
  sessionId: string,
  toolCallId: string,
): OperationCallRead {
  const row = requireCallRow(
    readFeedRow(sources, { sessionId, id: operationRowId(toolCallId) }),
    toolCallId,
  );

  const state = rowState(sources, sessionId, row);
  const work = startedWork(row);

  return work ? { ...state, work } : state;
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
  sources: CallSources,
  sessionId: string,
  row: ToolCallUpdate,
): CallState {
  if (row.state === 'settled') return settledState(row);

  const session = new CallingSession(sources.open.live(sessionId));

  const waiting = session.awaitsAnswer(row.toolCallId);

  return { status: waiting ? 'waiting_for_user' : 'still_running' };
}

function settledState(row: ToolCallUpdate): CallState {
  if (row.status === 'cancelled') return { status: 'cancelled' };

  if (row.status === 'failed')
    return { status: 'failed', error: failedMessage(row) };

  return completedState(row);
}

function completedState(row: ToolCallUpdate): CallState {
  const result = z.json().parse(row.rawOutput ?? null);
  const blob = fullResult(row);

  return blob
    ? { status: 'completed', result, fullResult: blob }
    : { status: 'completed', result };
}

function failedMessage(row: ToolCallUpdate): string {
  const result = z.object({ error: z.string() }).safeParse(row.rawOutput);

  return result.success ? result.data.error : 'The Operation failed';
}
