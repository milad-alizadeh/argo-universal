import type { AgentInfo, ConfiguredAgent } from '@repo/contracts';
import type { ConfigurationDeps } from './configuration-commands';
import {
  readConfiguredAgents,
  readConfiguredAgent,
  selectCustomDefinition,
} from './configuration-sql';
import { type CustomCheck, checkConfiguredAgent } from './custom-check';

const selectEnabledCustom = (agent: ConfiguredAgent): CustomCheck[] => {
  if (!isEnabledDefinition(agent)) return [];
  const definition = selectCustomDefinition(agent);
  return definition ? [{ agentId: agent.id, definition }] : [];
};
type CustomListDeps = Pick<
  ConfigurationDeps,
  'database' | 'checkAgentLaunch' | 'withAgentCheck'
>;
const describeCustomAgent = async (
  deps: CustomListDeps,
  agent: CustomCheck,
): Promise<AgentInfo[]> => {
  const check = await checkOwnedCustom(deps, agent);
  const configured = readConfiguredAgent(deps.database, agent.agentId);
  const current = configured && selectEnabledCustom(configured)[0];
  return current ? [customAgentInfo(current, check)] : [];
};
const customAgentInfo = (
  agent: CustomCheck,
  check: Awaited<ReturnType<typeof checkConfiguredAgent>>,
): AgentInfo => ({
  agent: agent.agentId,
  label: agent.definition.name,
  logo: '',
  availability: customAvailability(check),
});
const customAvailability = (
  check: Awaited<ReturnType<typeof checkConfiguredAgent>>,
): AgentInfo['availability'] => {
  if (check.status !== 'ready') return 'unavailable';
  return check.authentication ? 'not_signed_in' : 'available';
};

// Each listing checks every enabled custom program afresh; readiness is never read from the record.
export const listCustomAgents = async (
  deps: CustomListDeps,
): Promise<AgentInfo[]> =>
  (
    await Promise.all(
      readConfiguredAgents(deps.database)
        .flatMap(selectEnabledCustom)
        .map((agent) => describeCustomAgent(deps, agent)),
    )
  ).flat();

const isEnabledDefinition = (agent: ConfiguredAgent): boolean =>
  agent.enabled && !agent.configuration.removed;

const checkOwnedCustom = async (
  deps: CustomListDeps,
  agent: CustomCheck,
): Promise<Awaited<ReturnType<typeof checkConfiguredAgent>>> => {
  try {
    return await checkConfiguredAgent(deps, agent.agentId);
  } catch (error) {
    return failedCustomCheck(error);
  }
};
const failedCustomCheck = (
  error: unknown,
): Awaited<ReturnType<typeof checkConfiguredAgent>> => ({
  status: 'failed',
  failure: error instanceof Error ? error.message : 'Agent check failed',
});
