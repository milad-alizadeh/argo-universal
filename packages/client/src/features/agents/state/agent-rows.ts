import type {
  ACPAgent,
  AgentServer,
  AgentsRegistryOutput,
} from '@repo/contracts';
import { featuredIds } from './featured-ids';
import {
  byName,
  type InstalledAgents,
  type RegistryLoad,
} from './installed-agents';

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
  // The Registry cannot run it on this platform and it is not installed.
  unavailable: boolean;
};

// Rows while either load is still going or has failed, which the surface shows with its loading or failed state.
export interface AgentRows {
  status: 'loading' | 'failed' | 'loaded';
  rows: AgentRowEntry[];
}

type RegistryEntry = AgentsRegistryOutput['agents'][number];

const registryRow = (
  { entry, support }: RegistryEntry,
  installed: ReadonlySet<string>,
): AgentRowEntry => ({
  id: entry.id,
  name: entry.name,
  version: entry.version,
  description: entry.description,
  icon: entry.icon,
  repository: entry.repository,
  website: entry.website,
  license_url: entry.license_url,
  installed: installed.has(entry.id),
  unavailable: support === 'unavailable' && !installed.has(entry.id),
});

// The Registry's Agents in name order, marked by what the Server has installed.
const registryRows = (
  installed: readonly AgentServer[],
  registry: AgentsRegistryOutput,
): AgentRowEntry[] => {
  const ids = new Set(installed.map(({ id }) => id));

  return registry.agents.map((agent) => registryRow(agent, ids)).sort(byName);
};

// Before the Registry loads, an Installed Agent shows what the Server knows of it.
const installedRow = (agent: AgentServer): AgentRowEntry => ({
  id: agent.id,
  name: agent.name,
  version: agent.version,
  description: '',
  icon: agent.icon,
  installed: true,
  unavailable: false,
});

const installedFirst = (rows: AgentRowEntry[]): AgentRowEntry[] =>
  rows.sort((a, b) => Number(b.installed) - Number(a.installed));

const combinedStatus = (
  ...loads: (InstalledAgents | RegistryLoad)[]
): AgentRows['status'] => {
  if (loads.some(({ status }) => status === 'failed')) return 'failed';

  return loads.some(({ status }) => status === 'loading')
    ? 'loading'
    : 'loaded';
};

const pageRows = (
  installed: InstalledAgents,
  registry: RegistryLoad,
): AgentRowEntry[] => {
  if (installed.status !== 'loaded') return [];

  return registry.status === 'loaded'
    ? installedFirst(registryRows(installed.agents, registry.registry))
    : installed.agents.map(installedRow);
};

// The Agents page: Installed Agents first, then the rest of the Registry, each group in name order.
export const agentsPage = (
  installed: InstalledAgents,
  registry: RegistryLoad,
): AgentRows => ({
  status: combinedStatus(installed, registry),
  rows: pageRows(installed, registry),
});

const featured: ReadonlySet<string> = new Set(featuredIds);

const isFeatured = (agent: AgentRowEntry): boolean =>
  featured.has(agent.id) && !agent.unavailable;

// Get started's tiles: the featured Agents this platform can run, in name order.
export const featuredAgents = (
  installed: InstalledAgents,
  registry: RegistryLoad,
): AgentRows => {
  const status = combinedStatus(installed, registry);

  if (installed.status !== 'loaded' || registry.status !== 'loaded')
    return { status, rows: [] };

  const rows = registryRows(installed.agents, registry.registry);

  return { status, rows: rows.filter(isFeatured) };
};
