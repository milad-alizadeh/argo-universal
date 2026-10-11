import type {
  AgentCheck,
  AgentEnablementInput,
  AgentRegistration,
  ConfiguredAgent,
  CustomAgentDefinition,
  CustomAgentEditInput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../../storage';
import type { CheckAgentLaunch } from '../agent-launch';
import { AgentConfigurationSaveJob } from '../agent-storage';
import { readConfiguredAgent } from './configuration-sql';
import { type CustomCheck, checkCustomDefinition } from './custom-check';

export interface ConfigurationDeps {
  database: Database;
  databaseWriter: WriterActorRef;
  createId: () => string;
  checkAgentLaunch: CheckAgentLaunch;
}
type CustomSave = CustomCheck;
type SavedAgent = Pick<ConfiguredAgent, 'id' | 'enabled'> & {
  configuration: ConfiguredAgent['configuration'] | null;
};
const serializeConfiguration = ({
  configuration,
}: SavedAgent): string | null =>
  configuration === null ? null : JSON.stringify(configuration);
const saveConfiguration = (
  deps: ConfigurationDeps,
  agent: SavedAgent,
): Promise<void> =>
  writeDatabaseJobAndWaitForCommit(
    deps.databaseWriter,
    new AgentConfigurationSaveJob({
      ...agent,
      configuration: serializeConfiguration(agent),
    }),
  );
const requireAgent = (
  deps: ConfigurationDeps,
  agentId: string,
): ConfiguredAgent => {
  const agent = readConfiguredAgent(deps.database, agentId);
  if (!agent) throw new Error(`No configured Agent ${agentId}`);
  return agent;
};

// Saves only a definition whose program answered ACP initialize.
const saveCheckedCustomAgent = async (
  deps: ConfigurationDeps,
  save: CustomSave & { enabled: boolean },
): Promise<AgentRegistration> => {
  const check = await checkCustomDefinition(deps.checkAgentLaunch, save);
  if (check.status === 'failed') return check;
  const { agentId: id, enabled, definition } = save;
  const configuration: SavedAgent['configuration'] = {
    source: 'custom',
    definition,
  };
  await saveConfiguration(deps, { id, enabled, configuration });
  return { status: 'ready', agentId: id };
};

export const registerCustomAgent = (
  deps: ConfigurationDeps,
  definition: CustomAgentDefinition,
): Promise<AgentRegistration> =>
  saveCheckedCustomAgent(deps, {
    agentId: deps.createId(),
    definition,
    enabled: true,
  });

export const editCustomAgent = (
  deps: ConfigurationDeps,
  { agentId, definition }: CustomAgentEditInput,
): Promise<AgentRegistration> => {
  const { enabled, configuration } = requireAgent(deps, agentId);
  if (configuration.source !== 'custom')
    throw new Error(`Agent ${agentId} is not a custom Agent`);
  return saveCheckedCustomAgent(deps, { agentId, definition, enabled });
};

export const checkConfiguredAgent = (
  deps: ConfigurationDeps,
  agentId: string,
): Promise<AgentCheck> => {
  const { configuration } = requireAgent(deps, agentId);
  if (configuration.source === 'registry')
    return Promise.resolve({
      status: 'failed',
      failure: 'No release is installed.',
    });
  return checkCustomDefinition(deps.checkAgentLaunch, {
    agentId,
    definition: configuration.definition,
  });
};

export const setAgentEnabled = (
  deps: ConfigurationDeps,
  { agentId, enabled }: AgentEnablementInput,
): Promise<void> => {
  const { configuration } = requireAgent(deps, agentId);
  return saveConfiguration(deps, { id: agentId, enabled, configuration });
};
