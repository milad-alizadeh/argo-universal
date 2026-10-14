import type { AgentLoginOperation, AgentLoginSnapshot } from '@repo/contracts';

export type OwnedLogin = { ownerToken: string; snapshot: AgentLoginSnapshot };

export const loginIdentity = (operation: OwnedLogin): AgentLoginOperation => ({
  operationId: operation.snapshot.operationId,
  ownerToken: operation.ownerToken,
});
