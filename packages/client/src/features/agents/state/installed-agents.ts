import type { AgentServer, AgentsRegistryOutput } from '@repo/contracts';

// The Server's Installed Agents, in name order; loading is never an empty list.
export type InstalledAgents =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; agents: AgentServer[] };

export const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name);

// The Server's last answer stays while a later load fails.
export const installedAgents = (query: {
  data: readonly AgentServer[] | undefined;
  isError: boolean;
}): InstalledAgents => {
  if (query.data)
    return { status: 'loaded', agents: [...query.data].sort(byName) };

  return query.isError ? { status: 'failed' } : { status: 'loading' };
};

export type RegistryLoad =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; registry: AgentsRegistryOutput };

interface RegistryQuery {
  // The Registry copy the Server keeps; undefined until it is read.
  data: AgentsRegistryOutput | undefined;
  refreshing: boolean;
  failed: boolean;
}

const storedRegistry = (
  data: AgentsRegistryOutput | undefined,
): data is AgentsRegistryOutput => Boolean(data?.agents.length);

const registryFailed = ({ data, failed }: RegistryQuery): boolean =>
  failed || Boolean(data?.error);

const settledRegistry = (query: RegistryQuery): RegistryLoad => {
  if (registryFailed(query)) return { status: 'failed' };

  return query.data
    ? { status: 'loaded', registry: query.data }
    : { status: 'loading' };
};

// A stored Registry with Agents shows through a refresh and its failure; an empty one waits for the refresh.
export const registryLoad = (query: RegistryQuery): RegistryLoad => {
  if (storedRegistry(query.data))
    return { status: 'loaded', registry: query.data };

  return query.refreshing ? { status: 'loading' } : settledRegistry(query);
};
