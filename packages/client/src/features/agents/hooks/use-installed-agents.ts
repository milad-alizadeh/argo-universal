import { installedAgents } from '../state/agent-list';
import type { AgentRowEntry } from '../state/agent-status';
import { useAgents } from './use-agents';
import { useCustomAgents } from './use-custom-agents';

// The Server's Agents, built in and custom, as the Agents list draws them.
export function useInstalledAgents(): AgentRowEntry[] {
  const custom = (useCustomAgents().data ?? []).map(({ id, definition }) => ({
    id,
    name: definition.name,
  }));
  return installedAgents(useAgents().data ?? [], custom);
}
