import type { AgentInstallOperation } from '@repo/contracts';
import type { ConfigurationDeps } from '../../configuration/configuration-commands';
export type InstallBindings = ConfigurationDeps & {
  isInUse: (agentId: string) => boolean;
};
export type OwnedInstall = {
  operation: AgentInstallOperation;
  controller: AbortController;
  settled: Promise<void>;
  released: boolean;
};
