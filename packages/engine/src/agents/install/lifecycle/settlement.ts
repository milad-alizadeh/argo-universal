import type { AgentInstallOperation } from '@repo/contracts';
import { recheckIfFailed } from './cancelled-check';
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

const installRelease = (
  input: InstallationInput,
  owned: OwnedInstall,
  checking: Promise<boolean>,
): Promise<void> =>
  executeAgentInstall(
    { ...input, signal: owned.controller.signal, operation: owned.operation },
    checking,
  );

// The new release is checked once this install releases its setup ownership.
const executeOwnedInstallation = async (
  input: InstallationInput,
  owned: OwnedInstall,
  checking: Promise<boolean>,
): Promise<void> => {
  const checkAgain = (): void =>
    input.deps.afterInstall(owned.operation.agentId);

  await recheckIfFailed(
    checking,
    () => installRelease(input, owned, checking),
    checkAgain,
  );
  checkAgain();
};

export const settleAgentInstallation = async (
  input: InstallationInput,
  owned: OwnedInstall,
  checking: Promise<boolean>,
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
