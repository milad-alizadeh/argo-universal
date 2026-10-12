import type { AgentInstallOperation } from '@repo/contracts';
import { operationFailure } from './agent-install-operation';
import type { InstallPhase } from './agent-install-types';
export type InstallPhaseInput = {
  operation?: AgentInstallOperation;
  previousOperationId?: string;
  pending: boolean;
  failure?: string;
};
const recoveredOperation = (input: InstallPhaseInput): boolean =>
  input.operation !== undefined &&
  input.operation.operationId !== input.previousOperationId;
const transportFailed = (input: InstallPhaseInput): boolean =>
  Boolean(input.failure) && !recoveredOperation(input);
const operationPhase = (
  operation: AgentInstallOperation | undefined,
): InstallPhase => operation?.status ?? 'confirm';
export const installationPhase = (input: InstallPhaseInput): InstallPhase => {
  if (input.pending) return 'installing';
  return transportFailed(input) ? 'failed' : operationPhase(input.operation);
};
export const installationFailure = (
  input: InstallPhaseInput,
): string | undefined =>
  transportFailed(input) ? input.failure : operationFailure(input.operation);
