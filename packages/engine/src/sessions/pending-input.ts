import type { PendingElicitation, PendingPermission } from '@repo/contracts';

// A Session's waiting Permission requests and Elicitations, oldest first.
export interface InputRequestQueues {
  permissionQueue: readonly PendingPermission[];
  elicitationQueue: readonly PendingElicitation[];
}

export type PendingInputRequest =
  | { kind: 'permission'; requestId: string; request: PendingPermission }
  | { kind: 'elicitation'; requestId: string; request: PendingElicitation };

// The one Input request the Session waits on: the oldest Permission request, else the oldest Elicitation.
export function pendingInputRequest(
  queues: InputRequestQueues,
): PendingInputRequest | null {
  const [permission] = queues.permissionQueue;

  if (permission)
    return {
      kind: 'permission',
      requestId: permission.requestId,
      request: permission,
    };
  const [elicitation] = queues.elicitationQueue;

  return elicitation
    ? {
        kind: 'elicitation',
        requestId: elicitation.requestId,
        request: elicitation,
      }
    : null;
}
