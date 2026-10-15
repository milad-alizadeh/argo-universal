import type { Stats } from 'node:fs';
import { lstat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentConfiguration } from '@repo/contracts';
import { writeDatabaseJobAndWaitForCommit } from '../../../storage';
import { AgentConfigurationSaveJob } from '../../agent-storage';
import type { ConfigurationDeps } from '../../configuration/configuration-commands';
import { readConfiguredAgent } from '../../configuration/configuration-sql';
import { agentInstallDirectory } from '../selection/selection';

const missingDirectory = (cause: unknown): boolean =>
  cause instanceof Error && 'code' in cause && cause.code === 'ENOENT';

const readManagedRoot = async (home: string): Promise<Stats | undefined> => {
  try {
    return await lstat(join(home, 'agents'));
  } catch (error) {
    if (missingDirectory(error)) return;
    throw error;
  }
};

const removedConfiguration = (
  configuration: AgentConfiguration,
): AgentConfiguration => {
  if (configuration.source === 'custom')
    return { ...configuration, removed: true };

  return { ...configuration, release: null, removed: true };
};

export const removeAgentInstallation = async (input: {
  home: string;
  deps: ConfigurationDeps;
  agentId: string;
}): Promise<void> => {
  const agent = readConfiguredAgent(input.deps.database, input.agentId);

  if (!agent) throw new Error('Agent is not configured');
  invalidateRemovedAgent(input);

  if (agent.configuration.source === 'registry')
    await removeManagedFiles(input.home, input.agentId);
  await saveRemoval(input.deps, agent);
};

// Stop the idle process before its files go.
const invalidateRemovedAgent = (input: {
  deps: ConfigurationDeps;
  agentId: string;
}): void => input.deps.invalidateAgent?.(input.agentId);

const saveRemoval = (
  deps: ConfigurationDeps,
  agent: { id: string; configuration: AgentConfiguration },
): Promise<void> =>
  writeDatabaseJobAndWaitForCommit(
    deps.databaseWriter,
    new AgentConfigurationSaveJob({
      id: agent.id,
      enabled: false,
      configuration: JSON.stringify(removedConfiguration(agent.configuration)),
    }),
    true,
  );

const removeManagedFiles = async (
  home: string,
  agentId: string,
): Promise<void> => {
  if ((await readManagedRoot(home))?.isSymbolicLink())
    throw new Error('Managed installation directory is a symbolic link');
  await rm(agentInstallDirectory(home, agentId), {
    recursive: true,
    force: true,
  });
};
