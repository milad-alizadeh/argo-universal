import type { AgentStatus as ServerStatus } from '@repo/contracts';

// Where an Agent stands on this Server: its saved Readiness, a newer catalog release, or Disabled for a disabled Agent that was never checked.
export type AgentStatus = ServerStatus | 'update' | 'disabled';

export type StatusTone = 'success' | 'warning' | 'destructive' | 'pending';

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
  // What the last Readiness check observed, already sanitized by the Server.
  reason?: string;
  // A disabled Agent keeps its status but reads as Disabled in the list.
  disabled?: boolean;
}

export const agentStatusLabels: Record<AgentStatus, string> = {
  checking: 'Checking…',
  ready: 'Ready',
  update: 'Update available',
  'sign-in-needed': 'Sign-in needed',
  'account-not-supported': 'Account not supported',
  'not-compatible': 'Not compatible',
  'cant-start': 'Can’t start',
  'couldnt-check': 'Couldn’t check',
  'not-found': 'Not found',
  'not-installed': 'Not installed',
  disabled: 'Disabled',
};

// Green when ready, amber when it needs you, red when it is broken, a spinner while it is checked.
const statusTones: Record<AgentStatus, StatusTone | undefined> = {
  checking: 'pending',
  ready: 'success',
  update: 'warning',
  'sign-in-needed': 'warning',
  'account-not-supported': 'warning',
  'couldnt-check': 'warning',
  'not-compatible': 'destructive',
  'cant-start': 'destructive',
  'not-found': 'destructive',
  'not-installed': undefined,
  disabled: undefined,
};

export const statusTone = (status: AgentStatus): StatusTone | undefined =>
  statusTones[status];

const isInstalled = ({ status }: Pick<AgentRowEntry, 'status'>): boolean =>
  status !== 'not-installed';

// The user has to act before the Agent can run new Sessions; Checking… is never a failure.
export const needsAction = ({
  status,
}: Pick<AgentRowEntry, 'status'>): boolean =>
  statusTone(status) === 'warning' || statusTone(status) === 'destructive';

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
