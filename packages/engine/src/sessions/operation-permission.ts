import { permissionOptions, type PendingPermission } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { nativePermissionOutcomeEvent, type FeedActorRef } from '../feed';
import { nativePermissionEvent } from './native-permissions';
import type { SessionOperationCall } from './operation-call';
import { canConfirmOperation } from './operation-turn';
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
  if (!canConfirmOperation(session, feed, turnId))
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
  feed.send({
    type: nativePermissionOutcomeEvent,
    turnId: call.turnId,
    rowId: call.rowId,
    option: permissionOptions.find((item) => item.optionId === optionId),
  });
}
