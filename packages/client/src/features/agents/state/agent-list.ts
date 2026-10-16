import type {
  ACPAgent,
  AgentServer,
  AgentsRegistryOutput,
} from '@repo/contracts';

export type AgentsFilter = 'all' | 'installed' | 'not-installed';

export type AgentRowEntry = Pick<
  ACPAgent,
  | 'id'
  | 'name'
  | 'version'
  | 'description'
  | 'icon'
  | 'repository'
  | 'website'
  | 'license_url'
> & {
  installed: boolean;
  unavailable: boolean;
};

export const agentList = (
  installed: readonly AgentServer[],
  registry: AgentsRegistryOutput,
): AgentRowEntry[] => {
  const saved = new Set(installed.map(({ id }) => id));

  return registry.agents
    .map(({ entry, support }) => registryRow(entry, support, saved))
    .sort(compareAgents);
};

export const filterAgents = (
  agents: readonly AgentRowEntry[],
  filter: AgentsFilter,
  search: string,
): AgentRowEntry[] =>
  agents.filter(
    (agent) =>
      matchesFilter(agent, filter) &&
      `${agent.name}\n${agent.description ?? ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

const matchesFilter = (agent: AgentRowEntry, filter: AgentsFilter): boolean =>
  filter === 'all' || agent.installed === (filter === 'installed');

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

const registryRow = (
  entry: ACPAgent,
  support: AgentsRegistryOutput['agents'][number]['support'],
  saved: Set<string>,
): AgentRowEntry => ({
  ...entry,
  installed: saved.has(entry.id),
  unavailable: support === 'unavailable',
});

const compareAgents = (a: AgentRowEntry, b: AgentRowEntry): number =>
  Number(b.installed) - Number(a.installed) || a.name.localeCompare(b.name);
