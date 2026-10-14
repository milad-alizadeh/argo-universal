import type { AgentInstallOperation } from '@repo/contracts';
import { executeAgentInstall, type InstallExecutionInput } from './execution';
import {
  installationDeadline,
  installedOperation,
  rememberInstallFailure,
} from './operation-results';
import type { InstallBindings, OwnedInstall } from './operation-types';

type InstallationInput = Omit<
  InstallExecutionInput,
  'operation' | 'signal' | 'deps'
> & { deps: InstallBindings };

// The new release is checked once this install releases its setup ownership.
const executeOwnedInstallation = async (
  input: InstallationInput,
  owned: OwnedInstall,
  checking: Promise<unknown> | undefined,
): Promise<void> => {
  const { signal } = owned.controller;
  await executeAgentInstall(
    { ...input, signal, operation: owned.operation },
    checking,
  );
  input.deps.afterInstall(owned.operation.agentId);
};

export const settleAgentInstallation = async (
  input: InstallationInput,
  owned: OwnedInstall,
  checking?: Promise<unknown>,
): Promise<AgentInstallOperation> => {
  const timeout = installationDeadline(owned.controller);

  try {
    await executeOwnedInstallation(input, owned, checking);

    return installedOperation(owned);
  } catch (error) {
    return rememberInstallFailure(owned, error);
  } finally {
    clearTimeout(timeout);
  }
};
