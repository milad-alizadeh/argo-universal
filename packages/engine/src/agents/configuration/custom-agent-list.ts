import type { AgentInfo, ConfiguredAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { CheckAgentLaunch } from '../agent-launch';
import {
  readConfiguredAgents,
  selectCustomDefinition,
} from './configuration-sql';
import { type CustomCheck, checkCustomDefinition } from './custom-check';

const selectEnabledCustom = (agent: ConfiguredAgent): CustomCheck[] => {
  const definition = agent.enabled ? selectCustomDefinition(agent) : undefined;
  return definition ? [{ agentId: agent.id, definition }] : [];
};
type CustomListDeps = {
  database: Database;
  checkAgentLaunch: CheckAgentLaunch;
};
const describeCustomAgent = async (
  checkAgentLaunch: CheckAgentLaunch,
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
export const listCustomAgents = ({
  database,
  checkAgentLaunch,
}: CustomListDeps): Promise<AgentInfo[]> =>
  Promise.all(
    readConfiguredAgents(database)
      .flatMap(selectEnabledCustom)
      .map((agent) => describeCustomAgent(checkAgentLaunch, agent)),
  );
