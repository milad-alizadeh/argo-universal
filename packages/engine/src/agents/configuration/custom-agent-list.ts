import type { AgentInfo, ConfiguredAgent } from '@repo/contracts';
import type { ConfigurationDeps } from './configuration-commands';
import {
  readConfiguredAgents,
  selectCustomDefinition,
} from './configuration-sql';
import { type CustomCheck, checkCustomDefinition } from './custom-check';

const selectEnabledCustom = (agent: ConfiguredAgent): CustomCheck[] => {
  if (!isEnabledDefinition(agent)) return [];
  const definition = selectCustomDefinition(agent);
  return definition ? [{ agentId: agent.id, definition }] : [];
};
type CustomListDeps = Pick<
  ConfigurationDeps,
  'database' | 'checkAgentLaunch' | 'withAgentSetup'
>;
const describeCustomAgent = async (
  deps: CustomListDeps,
  agent: CustomCheck,
): Promise<AgentInfo> => {
  const check = await checkOwnedCustom(deps, agent);
  return {
    agent: agent.agentId,
    label: agent.definition.name,
    logo: '',
    availability: customAvailability(check),
    configOptions: [],
  };
};
const customAvailability = (
  check: Awaited<ReturnType<typeof checkCustomDefinition>>,
): AgentInfo['availability'] => {
  if (check.status !== 'ready') return 'unavailable';
  return check.authentication ? 'not_signed_in' : 'available';
};

// Each listing checks every enabled custom program afresh; readiness is never read from the record.
export const listCustomAgents = (deps: CustomListDeps): Promise<AgentInfo[]> =>
  Promise.all(
    readConfiguredAgents(deps.database)
      .flatMap(selectEnabledCustom)
      .map((agent) => describeCustomAgent(deps, agent)),
  );

const isEnabledDefinition = (agent: ConfiguredAgent): boolean =>
  agent.enabled && !agent.configuration.removed;

const checkOwnedCustom = async (
  deps: CustomListDeps,
  agent: CustomCheck,
): Promise<Awaited<ReturnType<typeof checkCustomDefinition>>> => {
  try {
    return await runOwnedCheck(deps, agent);
  } catch (error) {
    return failedCustomCheck(error);
  }
};
const runOwnedCheck = (
  deps: CustomListDeps,
  agent: CustomCheck,
): ReturnType<typeof checkCustomDefinition> => {
  const check = (): ReturnType<typeof checkCustomDefinition> =>
    checkCustomDefinition(deps.checkAgentLaunch, agent);
  return deps.withAgentSetup
    ? deps.withAgentSetup(agent.agentId, check)
    : check();
};
const failedCustomCheck = (
  error: unknown,
): Awaited<ReturnType<typeof checkCustomDefinition>> => ({
  status: 'failed',
  failure: error instanceof Error ? error.message : 'Agent check failed',
});
