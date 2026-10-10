import type {
  AgentCheck,
  AgentEnablementInput,
  AgentRegistration,
  ConfiguredAgent,
  CustomAgentDefinition,
  CustomAgentEditInput,
} from '@repo/contracts';
import type { Context } from '../../../engine/context';
import { writeDatabaseJobAndWaitForCommit } from '../../../storage';
import { AgentConfigurationSaveJob } from '../agent-storage';
import { type CustomCheck, checkCustomDefinition } from './agent-check';
import { readConfiguredAgent } from './configuration-sql';

type ConfigurationContext = Pick<
  Context,
  'database' | 'databaseWriter' | 'createId'
>;
type CustomSave = CustomCheck;
type SavedAgent = Pick<ConfiguredAgent, 'id' | 'enabled'> & {
  configuration: ConfiguredAgent['configuration'] | null;
};
const serializeConfiguration = ({
  configuration,
}: SavedAgent): string | null =>
  configuration === null ? null : JSON.stringify(configuration);
const saveConfiguration = (
  context: ConfigurationContext,
  agent: SavedAgent,
): Promise<void> =>
  writeDatabaseJobAndWaitForCommit(
    context.databaseWriter,
    new AgentConfigurationSaveJob({
      ...agent,
      configuration: serializeConfiguration(agent),
    }),
  );
const requireAgent = (
  context: ConfigurationContext,
  agentId: string,
): ConfiguredAgent => {
  const agent = readConfiguredAgent(context.database, agentId);
  if (!agent) throw new Error(`No configured Agent ${agentId}`);
  return agent;
};

// Saves only a definition whose program answered ACP initialize.
const saveCheckedCustomAgent = async (
  context: ConfigurationContext,
  save: CustomSave & { enabled: boolean },
): Promise<AgentRegistration> => {
  const check = await checkCustomDefinition(save);
  if (check.status === 'failed') return check;
  const { agentId: id, enabled, definition } = save;
  const configuration: SavedAgent['configuration'] = {
    source: 'custom',
    definition,
  };
  await saveConfiguration(context, { id, enabled, configuration });
  return { status: 'ready', agentId: id };
};

export const registerCustomAgent = (
  context: ConfigurationContext,
  definition: CustomAgentDefinition,
): Promise<AgentRegistration> =>
  saveCheckedCustomAgent(context, {
    agentId: context.createId(),
    definition,
    enabled: true,
  });

export const editCustomAgent = (
  context: ConfigurationContext,
  { agentId, definition }: CustomAgentEditInput,
): Promise<AgentRegistration> => {
  const { enabled, configuration } = requireAgent(context, agentId);
  if (configuration.source !== 'custom')
    throw new Error(`Agent ${agentId} is not a custom Agent`);
  return saveCheckedCustomAgent(context, { agentId, definition, enabled });
};

export const checkConfiguredAgent = (
  context: ConfigurationContext,
  agentId: string,
): Promise<AgentCheck> => {
  const { configuration } = requireAgent(context, agentId);
  if (configuration.source === 'registry')
    return Promise.resolve({
      status: 'failed',
      failure: 'No release is installed.',
    });
  return checkCustomDefinition({
    agentId,
    definition: configuration.definition,
  });
};

export const setAgentEnabled = (
  context: ConfigurationContext,
  { agentId, enabled }: AgentEnablementInput,
): Promise<void> => {
  const { configuration } = requireAgent(context, agentId);
  return saveConfiguration(context, { id: agentId, enabled, configuration });
};
