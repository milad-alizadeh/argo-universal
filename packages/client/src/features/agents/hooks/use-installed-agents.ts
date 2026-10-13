import type { AgentInfo, ConfiguredAgent } from '@repo/contracts';
import { installedAgents } from '../state/agent-list';
import type { AgentRowEntry } from '../state/agent-status';
import { useAgents } from './use-agents';
import { useConfiguredAgents } from './use-configured-agents';
import { useCustomAgents } from './use-custom-agents';

// The Server's Agents, built in and custom, as the Agents list draws them.
export function useInstalledAgents(): AgentRowEntry[] {
  const configured = useConfiguredAgents();

  const custom = (useCustomAgents().data ?? []).map(({ id, definition }) => ({
    id,
    name: definition.name,
  }));

  return installedAgents(
    currentChoices(useAgents().data, configured.data),
    custom,
  );
}

const removedIdentities = (configured: ConfiguredAgent[] = []): Set<string> =>
  new Set(
    configured.flatMap(({ id, configuration }) =>
      configuration.removed ? [id] : [],
    ),
  );

const currentChoices = (
  agents: AgentInfo[] = [],
  configured?: ConfiguredAgent[],
): AgentInfo[] => {
  const removed = removedIdentities(configured);

  return agents.filter(({ agent }) => !removed.has(agent));
};
