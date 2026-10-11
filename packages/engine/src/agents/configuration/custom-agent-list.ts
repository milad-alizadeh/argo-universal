import type { AgentInfo, ConfiguredAgent } from '@repo/contracts';
import type { ConfigurationDeps } from './configuration-commands';
import {
  readConfiguredAgents,
  selectCustomDefinition,
} from './configuration-sql';
import { type CustomCheck, checkCustomDefinition } from './custom-check';

const selectEnabledCustom = (agent: ConfiguredAgent): CustomCheck[] => {
  const definition = agent.enabled ? selectCustomDefinition(agent) : undefined;
  return definition ? [{ agentId: agent.id, definition }] : [];
};
type CustomListDeps = Pick<ConfigurationDeps, 'database' | 'checkAgentLaunch'>;
const describeCustomAgent = async (
  { checkAgentLaunch }: CustomListDeps,
  agent: CustomCheck,
): Promise<AgentInfo> => {
  const check = await checkCustomDefinition(checkAgentLaunch, agent);
  return {
    agent: agent.agentId,
    label: agent.definition.name,
    logo: '',
    availability: check.status === 'ready' ? 'available' : 'unavailable',
    configOptions: [],
  };
};

// Each listing checks every enabled custom program afresh; readiness is never read from the record.
export const listCustomAgents = (deps: CustomListDeps): Promise<AgentInfo[]> =>
  Promise.all(
    readConfiguredAgents(deps.database)
      .flatMap(selectEnabledCustom)
      .map((agent) => describeCustomAgent(deps, agent)),
  );
