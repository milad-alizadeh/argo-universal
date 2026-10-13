import type { AgentAvailability } from '@repo/contracts';

// Where an Agent stands on this Server, including a newer catalog release.
export type AgentStatus =
  | 'ready'
  | 'update'
  | 'sign-in'
  | 'unavailable'
  | 'not-installed';

export type StatusTone = 'success' | 'warning';

export type AgentsFilter = 'all' | 'installed' | 'not-installed';

// One Agent in the Agents list: installed on the Server or offered by the ACP Registry.
export interface AgentRowEntry {
  id: string;
  name: string;
  description?: string;
  // An SVG data URI or URL; a custom Agent has none and shows the Agent glyph.
  icon?: string;
  custom?: boolean;
  status: AgentStatus;
}

export const agentStatusLabels: Record<AgentStatus, string> = {
  ready: 'Ready',
  update: 'Update available',
  'sign-in': 'Sign-in needed',
  unavailable: 'Unavailable',
  'not-installed': 'Not installed',
};

const statusTones: Record<AgentStatus, StatusTone | undefined> = {
  ready: 'success',
  update: 'warning',
  'sign-in': 'warning',
  unavailable: 'warning',
  'not-installed': undefined,
};

const availabilityStatuses: Record<AgentAvailability, AgentStatus> = {
  available: 'ready',
  not_installed: 'not-installed',
  not_signed_in: 'sign-in',
  unavailable: 'unavailable',
};

export const statusTone = (status: AgentStatus): StatusTone | undefined =>
  statusTones[status];

export const availabilityStatus = (
  availability: AgentAvailability,
): AgentStatus => availabilityStatuses[availability];

const isInstalled = ({ status }: Pick<AgentRowEntry, 'status'>): boolean =>
  status !== 'not-installed';

// The user has to act before the Agent can run new Sessions.
export const needsAction = ({
  status,
}: Pick<AgentRowEntry, 'status'>): boolean => statusTone(status) === 'warning';

// The Agent can start a Session now; a newer release can wait.
export const runsSessions = ({
  status,
}: Pick<AgentRowEntry, 'status'>): boolean =>
  status === 'ready' || status === 'update';

const filters: Record<AgentsFilter, (agent: AgentRowEntry) => boolean> = {
  all: () => true,
  installed: isInstalled,
  'not-installed': (agent) => !isInstalled(agent),
};

const matchesSearch = (agent: AgentRowEntry, search: string): boolean =>
  `${agent.name}\n${agent.description ?? ''}`
    .toLowerCase()
    .includes(search.trim().toLowerCase());

export function filterAgents(
  agents: readonly AgentRowEntry[],
  { filter, search }: { filter: AgentsFilter; search: string },
): AgentRowEntry[] {
  return agents.filter(
    (agent) => filters[filter](agent) && matchesSearch(agent, search),
  );
}

export interface AgentCounts {
  installed: number;
  notInstalled: number;
}

export const countAgents = (agents: readonly AgentRowEntry[]): AgentCounts => ({
  installed: agents.filter(isInstalled).length,
  notInstalled: agents.filter((agent) => !isInstalled(agent)).length,
});
