import type { AgentRowEntry } from './agent-rows';

export type AgentsFilter = 'all' | 'installed' | 'not-installed';

const matchesFilter = (agent: AgentRowEntry, filter: AgentsFilter): boolean =>
  filter === 'all' || agent.installed === (filter === 'installed');

const matchesSearch = (agent: AgentRowEntry, search: string): boolean =>
  `${agent.name}\n${agent.description}`
    .toLowerCase()
    .includes(search.trim().toLowerCase());

// The Agents page rows its filter and search leave, in their order.
export const filterAgents = (
  agents: readonly AgentRowEntry[],
  filter: AgentsFilter,
  search: string,
): AgentRowEntry[] =>
  agents.filter(
    (agent) => matchesFilter(agent, filter) && matchesSearch(agent, search),
  );

const emptyLabels = {
  all: ['No Agents available.', 'No Agents match your search.'],
  installed: ['No installed Agents.', 'No installed Agents match your search.'],
  'not-installed': [
    'No uninstalled Agents.',
    'No uninstalled Agents match your search.',
  ],
} satisfies Record<AgentsFilter, [string, string]>;

export const agentsEmptyLabel = (
  filter: AgentsFilter,
  search: string,
): string => emptyLabels[filter][search.trim() ? 1 : 0];
