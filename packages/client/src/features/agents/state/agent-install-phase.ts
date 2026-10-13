import type { AgentInstallOperation } from '@repo/contracts';
import type {
  AgentInstallPresentation,
  InstallNotice,
} from './agent-install-types';

export type InstallPhaseInput = {
  operation?: AgentInstallOperation;
  previousOperationId?: string;
  pending: boolean;
  // Why the start request failed, and which request it was.
  failure?: string;
  requestId?: number;
  // A Server status newer than the failure arrived: a lost response would show its operation there.
  failureConfirmed: boolean;
  // Operations this page saw running: only their outcome is news here.
  watched: readonly string[];
};

const recoveredOperation = (input: InstallPhaseInput): boolean =>
  input.operation !== undefined &&
  input.operation.operationId !== input.previousOperationId;

const transportFailed = (input: InstallPhaseInput): boolean =>
  Boolean(input.failure) && !recoveredOperation(input);

const awaitingStatus = (input: InstallPhaseInput): boolean =>
  input.pending || (Boolean(input.failure) && !input.failureConfirmed);

const operationRunning = (input: InstallPhaseInput): boolean =>
  !transportFailed(input) && input.operation?.status === 'installing';

export const installationRunning = (input: InstallPhaseInput): boolean =>
  awaitingStatus(input) || operationRunning(input);

const settledOutcome = (
  operation: AgentInstallOperation,
): InstallNotice | undefined => {
  const key = operation.operationId;

  if (operation.status === 'installed')
    return { key, result: 'installed', version: operation.version };

  if (operation.status === 'failed')
    return { key, result: 'failed', failure: operation.failure };

  return undefined;
};

const requestNotice = (input: InstallPhaseInput): InstallNotice => ({
  key: `request:${input.requestId ?? 0}`,
  result: 'failed',
  failure: input.failure ?? '',
});

// A new operation after this page's request is that request's, even when its response was lost.
const requested = (input: InstallPhaseInput): boolean =>
  Boolean(input.requestId) && recoveredOperation(input);

const watchedNotice = (
  operation: AgentInstallOperation,
  input: InstallPhaseInput,
): InstallNotice | undefined =>
  requested(input) || input.watched.includes(operation.operationId)
    ? settledOutcome(operation)
    : undefined;

// One notice per settled request or watched operation; a poll or a remount repeats the same key.
const settledNotice = (input: InstallPhaseInput): InstallNotice | undefined =>
  transportFailed(input)
    ? requestNotice(input)
    : input.operation && watchedNotice(input.operation, input);

export const installationNotice = (
  input: InstallPhaseInput,
): InstallNotice | undefined =>
  awaitingStatus(input) ? undefined : settledNotice(input);

// The page keeps the action in place while it asks or while the installation runs.
export const installationActive = (
  installation: AgentInstallPresentation | undefined,
): boolean =>
  Boolean(installation && (installation.confirming || installation.installing));
