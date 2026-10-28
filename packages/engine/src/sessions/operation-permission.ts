import { permissionOptions, type PendingPermission } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { FeedActorRef } from '../feed';
import { nativePermissionEvent } from './native-permissions';
import type { SessionOperationCall } from './operation-call';
import type { SessionActorRef } from './session-machine';

type Operation = {
  name: string;
  label: string;
  input: string;
  description: string;
};

export async function confirmOperation(
  { session, feed }: { session: SessionActorRef; feed: FeedActorRef },
  call: Pick<SessionOperationCall, 'toolCallId' | 'rowId' | 'turnId'>,
  operation: Operation,
): Promise<void> {
  requireCallingTurn(session, feed, call.turnId);
  const { context } = session.getSnapshot();
  const request = permissionRequest(context.input.createId(), call, operation);
  const answer = Promise.withResolvers<string | null>();
  context.nativePermissions.register(request.requestId, (optionId) => {
    publishOutcome(feed, call, optionId);
    answer.resolve(optionId);
  });
  session.send({ type: nativePermissionEvent, turnId: call.turnId, request });
  const option = await answer.promise;

  if (option === null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'The Permission request was cancelled',
    });

  if (option !== 'allow_once')
    throw new TRPCError({ code: 'FORBIDDEN', message: 'The user refused' });
  requireCallingTurn(session, feed, call.turnId);
}

function requireCallingTurn(
  session: SessionActorRef,
  feed: FeedActorRef,
  turnId: string | null,
): asserts turnId is string {
  if (
    !session.getSnapshot().matches({ open: { acp: 'activeTurn' } }) ||
    turnId === null ||
    session.getSnapshot().context.activeTurnId !== turnId ||
    feed.getSnapshot().context.lastSettledTurnId === turnId
  )
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Permission request requires an active Turn',
    });
}

const permissionRequest = (
  requestId: string,
  call: Pick<SessionOperationCall, 'toolCallId'>,
  operation: Operation,
): PendingPermission => ({
  requestId,
  toolCallId: call.toolCallId,
  title: operation.label,
  operation: {
    id: operation.name,
    description: operation.description,
    input: operation.input,
  },
  options: permissionOptions,
});

function publishOutcome(
  feed: FeedActorRef,
  call: Pick<SessionOperationCall, 'rowId' | 'turnId'>,
  optionId: string | null,
): void {
  const option = permissionOptions.find((item) => item.optionId === optionId);

  const permissionOutcome = option
    ? { outcome: 'selected' as const, ...option }
    : { outcome: 'cancelled' as const };

  feed.send({
    type: 'feed.change',
    turnId: call.turnId,
    change: {
      type: 'patch',
      id: call.rowId,
      set: { _meta: { argo: { permissionOutcome } } },
    },
  });
}
