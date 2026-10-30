import type { PendingPermission } from '@repo/contracts';
import {
  permissionSelectedEvent,
  permissionsCancelledEvent,
  type FeedEvent,
  type FeedTurnEnding,
} from '../feed';
import { chosenOption } from './admission/answer-admission';
import type { PermissionHooked } from './permission-hooks';
import type { SessionContext } from './session-context';

type PermissionsCancelled = Extract<
  FeedEvent,
  { type: 'feed.permissionsCancelled' }
>;

const feedSessionId = (context: SessionContext): string =>
  context.acpLease?.sessionId ?? '';

const headPermission = (context: SessionContext): PendingPermission => {
  const request = context.permissionQueue[0];

  if (!request) throw new Error('No Permission request to answer');

  return request;
};

// Each cancelled Permission request shows its outcome on its Tool call.
const cancelledPermissions = (
  context: SessionContext,
  requests: readonly PendingPermission[],
): PermissionsCancelled => ({
  type: permissionsCancelledEvent,
  turnId: context.activeTurnId,
  acpSessionId: feedSessionId(context),
  toolCallIds: requests.map((request) => request.toolCallId),
});

const selectedPermission = (
  context: SessionContext,
  request: PendingPermission,
  option: NonNullable<ReturnType<typeof chosenOption>>,
): FeedEvent => ({
  type: permissionSelectedEvent,
  turnId: context.activeTurnId,
  acpSessionId: feedSessionId(context),
  toolCallId: request.toolCallId,
  option,
});

// Whether an answer to the first queued request denies it with a reject option.
export const deniesPermission = (
  context: SessionContext,
  optionId: string | null,
): boolean => {
  const request = context.permissionQueue[0];
  const option = request && chosenOption(request, optionId);

  return option?.kind === 'reject_once' || option?.kind === 'reject_always';
};

// What the Feed shows once the first queued request is answered.
export const permissionOutcome = (
  context: SessionContext,
  optionId: string | null,
): FeedEvent => {
  const request = headPermission(context);
  const option = chosenOption(request, optionId);

  if (option === undefined)
    throw new Error('The Agent did not offer that option');

  if (option === null) return cancelledPermissions(context, [request]);

  return selectedPermission(context, request, option);
};

// A Hook's answer for a request still queued waits until the request is first.
export const rememberHookedPermission = (
  context: SessionContext,
  hooked: PermissionHooked,
): SessionContext['hookedPermissions'] =>
  hooked.answer &&
  context.permissionQueue.some(
    (request) => request.requestId === hooked.requestId,
  )
    ? {
        ...context.hookedPermissions,
        [hooked.requestId]: hooked.answer.optionId,
      }
    : context.hookedPermissions;

// The answer a Hook gave the first queued request, if it gave one.
export const hookedAnswer = (
  context: SessionContext,
): { requestId: string; optionId: string | null } | undefined => {
  const request = context.permissionQueue[0];

  if (!request || !(request.requestId in context.hookedPermissions))
    return undefined;

  return {
    requestId: request.requestId,
    optionId: hookedOption(context, request.requestId),
  };
};

const hookedOption = (
  context: SessionContext,
  requestId: string,
): string | null => context.hookedPermissions[requestId] ?? null;

// The Agent withdrew a request: its Tool call shows the cancellation.
type WithdrawnRequest = {
  cancelled: PermissionsCancelled;
  queues: Pick<SessionContext, 'permissionQueue' | 'elicitationQueue'>;
};

type RequestQueues = WithdrawnRequest['queues'];

const remainingRequests = (
  context: SessionContext,
  requestId: string,
): RequestQueues => ({
  permissionQueue: context.permissionQueue.filter(
    (request) => request.requestId !== requestId,
  ),
  elicitationQueue: context.elicitationQueue.filter(
    (request) => request.requestId !== requestId,
  ),
});

export const withdrawRequest = (
  context: SessionContext,
  requestId: string,
): WithdrawnRequest => {
  return {
    cancelled: cancelledPermissions(
      context,
      context.permissionQueue.filter(
        (request) => request.requestId === requestId,
      ),
    ),
    queues: remainingRequests(context, requestId),
  };
};

const pendingToolCalls = (context: SessionContext): string[] =>
  context.permissionQueue.flatMap((request) =>
    request.operation ? [] : [request.toolCallId],
  );

const endingAfterCancellation = (context: SessionContext): FeedTurnEnding => ({
  ...context.turnEnding,
  waitingPermissions: {
    acpSessionId: feedSessionId(context),
    toolCallIds: [
      ...(context.turnEnding.waitingPermissions?.toolCallIds ?? []),
      ...pendingToolCalls(context),
    ],
  },
});

// The Turn's end remembers the Permission requests it left unanswered.
export const cancelRequests = (
  context: SessionContext,
): Pick<
  SessionContext,
  'turnEnding' | 'permissionQueue' | 'elicitationQueue'
> => {
  return {
    turnEnding: endingAfterCancellation(context),
    permissionQueue: [],
    elicitationQueue: [],
  };
};
