import type { PendingElicitation, PendingPermission } from '@repo/contracts';

// A Session's waiting Permission requests and Elicitations, oldest first.
export interface InputRequestQueues {
  permissionQueue: readonly PendingPermission[];
  elicitationQueue: readonly PendingElicitation[];
}

export type PendingInputRequest =
  | { kind: 'permission'; request: PendingPermission }
  | { kind: 'elicitation'; request: PendingElicitation };

// The one Input request the Session waits on: the oldest Permission request, else the oldest Elicitation.
export function pendingInputRequest(
  queues: InputRequestQueues,
): PendingInputRequest | null {
  const [permission] = queues.permissionQueue;

  if (permission) return { kind: 'permission', request: permission };
  const [elicitation] = queues.elicitationQueue;

  return elicitation ? { kind: 'elicitation', request: elicitation } : null;
}
