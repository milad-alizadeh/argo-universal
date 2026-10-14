import { randomUUID } from 'node:crypto';
import type { AgentInstallInput, AgentInstallOperation } from '@repo/contracts';
import { InstallCleanupError } from '../processes/process';
import { installationFailure } from '../selection/status';
import type { OwnedInstall } from './operation-types';

const installTimeout = 300_000;

const wasCancelled = (cause: unknown): boolean =>
  cause instanceof DOMException && cause.name === 'AbortError';

const failedOperation = (
  owned: OwnedInstall,
  cause: unknown,
): AgentInstallOperation =>
  wasCancelled(owned.controller.signal.reason)
    ? { ...owned.operation, status: 'cancelled' }
    : {
        ...owned.operation,
        status: 'failed',
        failure: installationFailure(cause),
      };

export const startOperation = (
  input: AgentInstallInput,
): AgentInstallOperation => ({
  ...input,
  operationId: randomUUID(),
  status: 'installing',
});

export const inUseOperation = (
  operation: AgentInstallOperation,
): AgentInstallOperation => ({
  ...operation,
  status: 'failed',
  failure:
    'Agent is in use. Finish its setup or close its Sessions before installing',
});

export const installationDeadline = (
  controller: AbortController,
): ReturnType<typeof setTimeout> =>
  setTimeout(
    () => controller.abort(new Error('Agent installation timed out')),
    installTimeout,
  );

export const installedOperation = (
  owned: OwnedInstall,
): AgentInstallOperation => ({ ...owned.operation, status: 'installed' });

export const abortInstallation = (owned: OwnedInstall, reason: string): void =>
  owned.controller.abort(new DOMException(reason, 'AbortError'));

export const rememberInstallFailure = (
  owned: OwnedInstall,
  cause: unknown,
): AgentInstallOperation => {
  if (!(cause instanceof InstallCleanupError))
    return failedOperation(owned, cause);
  owned.released = false;
  owned.operation = {
    ...owned.operation,
    status: 'failed',
    failure: cause.message,
  };
  throw cause;
};

export const createOwnedInstall = (
  operation: AgentInstallOperation,
): OwnedInstall => ({
  operation,
  controller: new AbortController(),
  settled: Promise.resolve(),
  released: true,
});
