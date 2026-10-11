import type { AgentCapabilities } from '@repo/agents';
import type {
  PendingElicitation,
  PendingPermission,
  PermissionOption,
} from '@repo/contracts';

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

// Only the oldest Permission request is answerable, and only with an option the Agent offered.
export const admitsPermissionAnswer = (
  permissionQueue: readonly PendingPermission[],
  answer: PermissionAnswer,
): boolean => {
  const request = permissionQueue[0];
  return (
    request?.requestId === answer.requestId &&
    chosenOption(request, answer.optionId) !== undefined
  );
};

export const admitsElicitationAnswer = (
  elicitationQueue: readonly Pick<PendingElicitation, 'requestId'>[],
  requestId: PendingElicitation['requestId'],
): boolean => elicitationQueue[0]?.requestId === requestId;

// Only a rejection carries feedback, and only to an Agent that reads it.
export const canDeliverFeedback = (
  capabilities: Pick<AgentCapabilities, 'permissionFeedback'> | null,
  option: PermissionOption,
): boolean =>
  option.kind.startsWith('reject') && capabilities?.permissionFeedback === true;
