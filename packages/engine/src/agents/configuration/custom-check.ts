import type {
  AgentCheck,
  AgentConfiguration,
  CustomAgentDefinition,
} from '@repo/contracts';
import type { CheckAgentLaunch } from '../agent-launch';
import type { ConfigurationDeps } from './configuration-commands';
import { readConfiguredAgent } from './configuration-sql';
import { createCustomAgentLaunch } from './custom-launch';

export type CustomCheck = {
  agentId: string;
  definition: CustomAgentDefinition;
};

// The ACP module runs the handshake; the Agents module only names what to launch.
export const checkCustomDefinition = (
  checkAgentLaunch: CheckAgentLaunch,
  { agentId, definition }: CustomCheck,
): Promise<AgentCheck> =>
  checkAgentLaunch({
    name: definition.name,
    launch: createCustomAgentLaunch({ agentId, definition }),
  });

export const checkConfiguredAgent = (
  deps: Pick<
    ConfigurationDeps,
    'database' | 'checkAgentLaunch' | 'withAgentCheck'
  >,
  agentId: string,
): Promise<AgentCheck> => {
  const check = (): Promise<AgentCheck> => readConfiguredCheck(deps, agentId);

  return deps.withAgentCheck ? deps.withAgentCheck(agentId, check) : check();
};

const readConfiguredCheck = (
  deps: Pick<ConfigurationDeps, 'database' | 'checkAgentLaunch'>,
  agentId: string,
): Promise<AgentCheck> => {
  const agent = readConfiguredAgent(deps.database, agentId);

  if (!agent) throw new Error(`No configured Agent ${agentId}`);

  return checkSavedDefinition(deps.checkAgentLaunch, {
    agentId,
    configuration: agent.configuration,
  });
};

const checkSavedDefinition = (
  check: CheckAgentLaunch,
  {
    agentId,
    configuration,
  }: { agentId: string; configuration: AgentConfiguration },
): Promise<AgentCheck> => {
  if (configuration.removed) return failedCheck('Agent was removed.');

  if (configuration.source === 'registry')
    return failedCheck('No release is installed.');

  return checkCustomDefinition(check, {
    agentId,
    definition: configuration.definition,
  });
};

const failedCheck = (failure: string): Promise<AgentCheck> =>
  Promise.resolve({ status: 'failed', failure });
