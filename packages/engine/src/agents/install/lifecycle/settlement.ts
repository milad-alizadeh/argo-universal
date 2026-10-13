import type { AgentInstallOperation } from '@repo/contracts';
import { executeAgentInstall, type InstallExecutionInput } from './execution';
import {
  installationDeadline,
  installedOperation,
  rememberInstallFailure,
} from './operation-results';
import type { OwnedInstall } from './operation-types';

type InstallationInput = Omit<InstallExecutionInput, 'operation' | 'signal'>;
const executeOwnedInstallation = (
  input: InstallationInput,
  owned: OwnedInstall,
): Promise<void> =>
  executeAgentInstall({
    ...input,
    signal: owned.controller.signal,
    operation: owned.operation,
  });

export const settleAgentInstallation = async (
  input: InstallationInput,
  owned: OwnedInstall,
): Promise<AgentInstallOperation> => {
  const timeout = installationDeadline(owned.controller);
  try {
    await executeOwnedInstallation(input, owned);
    return installedOperation(owned);
  } catch (error) {
    return rememberInstallFailure(owned, error);
  } finally {
    clearTimeout(timeout);
  }
};
