import type { AgentCapabilities } from '@repo/agents';
import type { PendingPermission, PermissionOption } from '@repo/contracts';

type PermissionAnswer = {
  requestId: PendingPermission['requestId'];
  optionId: PermissionOption['optionId'] | null;
};

// The offered option an answer chose: null when it cancels, undefined when the Agent did not offer it.
export const chosenOption = (
  request: PendingPermission,
  optionId: PermissionAnswer['optionId'],
): PermissionOption | null | undefined =>
  optionId === null
    ? null
    : request.options.find(
        (candidate): boolean => candidate.optionId === optionId,
      );

// Only the oldest request is answerable; an answer to any other is already answered or unknown.
export const answeredRequest = <Request extends { requestId: string }>(
  queue: readonly Request[],
  requestId: Request['requestId'],
): Request | undefined =>
  queue[0]?.requestId === requestId ? queue[0] : undefined;

export const admitsPermissionAnswer = (
  permissionQueue: readonly PendingPermission[],
  answer: PermissionAnswer,
): boolean => {
  const request = answeredRequest(permissionQueue, answer.requestId);
  return (
    request !== undefined &&
    chosenOption(request, answer.optionId) !== undefined
  );
};

// Only a rejection carries feedback, and only to an Agent that reads it.
export const canDeliverFeedback = (
  capabilities: Pick<AgentCapabilities, 'permissionFeedback'> | null,
  option: PermissionOption,
): boolean =>
  option.kind.startsWith('reject') && capabilities?.permissionFeedback === true;
