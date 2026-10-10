import type { AgentInfo, ConfiguredAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import { type CustomCheck, checkCustomDefinition } from './agent-check';
import {
  readConfiguredAgents,
  selectCustomDefinition,
} from './configuration-sql';

const selectEnabledCustom = (agent: ConfiguredAgent): CustomCheck[] => {
  const definition = agent.enabled ? selectCustomDefinition(agent) : undefined;
  return definition ? [{ agentId: agent.id, definition }] : [];
};
const describeCustomAgent = async (agent: CustomCheck): Promise<AgentInfo> => {
  const check = await checkCustomDefinition(agent);
  return {
    agent: agent.agentId,
    label: agent.definition.name,
    logo: '',
    availability: check.status === 'ready' ? 'available' : 'unavailable',
    configOptions: [],
  };
};

// Each listing checks every enabled custom program afresh; readiness is never read from the record.
export const listCustomAgents = (database: Database): Promise<AgentInfo[]> =>
  Promise.all(
    readConfiguredAgents(database)
      .flatMap(selectEnabledCustom)
      .map(describeCustomAgent),
  );
