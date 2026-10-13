import type { LoginOperation } from './login-operation';

// Forgets finished sign-ins, oldest first, until there is room for a new one.
export const evictFinishedLogins = (
  operations: Map<string, LoginOperation>,
  latest: Map<string, string>,
  limit: number,
): void => {
  for (const [id, operation] of operations) {
    if (operations.size < limit) return;
    if (operation.blocksMutation()) continue;
    operations.delete(id);
    for (const [agentId, operationId] of latest)
      if (operationId === id) latest.delete(agentId);
  }
};
