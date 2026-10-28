import type { FeedUpdate } from '@repo/contracts';
import type { OperationWorkTarget } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import { toolCallEvent, type FeedActorRef } from '../feed';
import type { OpenSessionsActorRef } from './open-sessions-machine';
import { confirmOperation } from './operation-permission';
import { canConfirmOperation, ownsOperationTurn } from './operation-turn';
import type { SessionActorRef } from './session-machine';
import { findSessionFeed, requireLiveSessionActor } from './session-system';

type Operation = { name: string; label: string; input: Json };

type Result = { output: Json } | { error: string };

type Tool = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;

export type SessionOperationCall = {
  readonly canConfirm: boolean;
  toolCallId: string;
  rowId: string;
  turnId: string | null;
  finish: (result: Result) => void;
  confirm: (description: string) => Promise<void>;
  started: (work: OperationWorkTarget) => void;
};

const toolRow = (id: string, operation: Operation): Tool => ({
  id: `argo:${id}`,
  sessionUpdate: 'tool_call_update',
  state: 'open',
  toolCallId: id,
  title: operation.label,
  name: operation.name,
  kind: 'other',
  status: 'in_progress',
  content: [],
  rawInput: operation.input,
});

const completedRow = (row: Tool, result: Result): Tool => ({
  ...row,
  state: 'settled',
  status: 'error' in result ? 'failed' : 'completed',
  rawOutput: 'error' in result ? { error: result.error } : result.output,
});

function canSettleOperation(
  session: SessionActorRef,
  feed: FeedActorRef,
  turnId: string | null,
): boolean {
  const snapshot = session.getSnapshot();

  if (snapshot.status !== 'active') return false;

  if (turnId === null) return true;

  return ownsOperationTurn(session, feed, turnId);
}

class OperationCall implements SessionOperationCall {
  public readonly toolCallId: string;
  public readonly rowId: string;
  public readonly turnId: string | null;
  private row: Tool;
  private finished = false;
  private readonly closing: AbortSignal;
  public constructor(
    private readonly session: SessionActorRef,
    private readonly feed: FeedActorRef,
    private readonly operation: Operation,
  ) {
    const context = session.getSnapshot().context;
    this.toolCallId = context.input.createId();
    this.turnId = context.activeTurnId;
    this.row = toolRow(this.toolCallId, operation);
    this.rowId = this.row.id;
    this.closing = context.acpLifetime.signal;
    this.closing.addEventListener('abort', this.cancel, { once: true });
    this.publish(this.row);
  }
  private publish(row: Tool): void {
    this.feed.send(toolCallEvent(row, this.turnId));
  }
  private readonly cancel = (): void =>
    this.settle({ ...this.row, state: 'settled', status: 'cancelled' });
  public get canConfirm(): boolean {
    return canConfirmOperation(this.session, this.feed, this.turnId);
  }
  public confirm(description: string): Promise<void> {
    return confirmOperation({ session: this.session, feed: this.feed }, this, {
      ...this.operation,
      description,
      input: JSON.stringify(this.operation.input),
    });
  }
  public finish(result: Result): void {
    this.settle(completedRow(this.row, result));
  }
  public started(work: OperationWorkTarget): void {
    if (this.finished) return;

    if (!canSettleOperation(this.session, this.feed, this.turnId)) return;
    this.row = { ...this.row, _meta: { argo: { operationWork: work } } };
    this.publish(this.row);
  }
  private settle(row: Tool): void {
    if (this.finished) return;
    this.finished = true;
    this.closing.removeEventListener('abort', this.cancel);

    if (!canSettleOperation(this.session, this.feed, this.turnId)) return;
    this.publish(row);
  }
}

export function beginSessionOperation(
  sessions: OpenSessionsActorRef,
  sessionId: string,
  operation: Operation,
): SessionOperationCall {
  const session = requireLiveSessionActor(sessions.system, sessionId);
  if (!session.getSnapshot().context.stored)
    throw new TRPCError({ code: 'CONFLICT', message: 'The calling Session is still opening' });
  const feed = findSessionFeed(sessions.system, sessionId);

  if (!feed || session.getSnapshot().status !== 'active')
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'The calling Session is closed',
    });

  return new OperationCall(session, feed, operation);
}
