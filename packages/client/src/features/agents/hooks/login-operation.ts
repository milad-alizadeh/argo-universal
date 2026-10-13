import type { AgentLoginSnapshot } from '@repo/contracts';
export type OwnedLogin = { ownerToken: string; snapshot: AgentLoginSnapshot };
export const loginIdentity = (
  operation: OwnedLogin,
): { operationId: string; ownerToken: string } => ({
  operationId: operation.snapshot.operationId,
  ownerToken: operation.ownerToken,
});
