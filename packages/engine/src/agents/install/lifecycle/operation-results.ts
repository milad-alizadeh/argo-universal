import { randomUUID } from 'node:crypto';
import type { AgentInstallInput, AgentInstallOperation } from '@repo/contracts';
import { installationFailure } from '../selection/status';
import type { OwnedInstall } from './operation-types';
const installTimeout = 300_000;
const wasCancelled = (reason: unknown): boolean =>
  reason instanceof DOMException && reason.name === 'AbortError';
export const failedOperation = (
  owned: OwnedInstall,
  error: unknown,
): AgentInstallOperation =>
  wasCancelled(owned.controller.signal.reason)
    ? { ...owned.operation, status: 'cancelled' }
    : {
        ...owned.operation,
        status: 'failed',
        failure: installationFailure(error),
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
