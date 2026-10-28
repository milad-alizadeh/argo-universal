import type { AgentServer, AgentsRegistryOutput } from '@repo/contracts';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTRPC, type ClientError } from '#features/connection';
import { type AgentRows, agentsPage } from '../utils/agent-rows';
import {
  type InstalledAgents,
  installedAgents,
  type RegistryLoad,
  registryLoad,
} from '../utils/installed-agents';
import {
  type AgentChanges,
  useAgentChanges,
  useInstalledInvalidation,
} from './use-agent-changes';

export const registryError =
  'Failed to load the Agent Registry. Please check your connection and try again.';

export const installedError = 'Failed to load installed Agents.';

function useInstalledQuery(): UseQueryResult<AgentServer[], ClientError> {
  return useQuery(useTRPC().agent.list.queryOptions());
}

// The Server's Installed Agents, in name order; loading is a status, never an empty list.
export function useInstalledAgents(): InstalledAgents {
  return installedAgents(useInstalledQuery());
}

type RegistryRefresh = UseMutationResult<
  AgentsRegistryOutput,
  ClientError,
  void | Record<string, never> | undefined
>;

/*
 * Sync asks the Server for its Registry copy and lets it decide whether to fetch; refresh makes it fetch.
 * Opening a surface syncs, so a reader who opens the Agents page twice in a minute waits for the CDN once;
 * Retry refreshes, because a reader who presses it is saying the copy is the thing that is wrong.
 */
type RegistryCall = 'sync' | 'refresh';

// A refreshed Registry can change which Installed Agents the Server lists.
function useRegistryCall(call: RegistryCall): RegistryRefresh {
  const trpc = useTRPC(),
    cache = useQueryClient(),
    invalidate = useInstalledInvalidation();

  const onSuccess = (data: AgentsRegistryOutput): void => {
    cache.setQueryData(trpc.registry.get.queryKey(), data);
    void invalidate();
  };

  return useMutation(trpc.registry[call].mutationOptions({ onSuccess }));
}

interface Registry {
  load: RegistryLoad;
  refresh: () => void;
}

// Either call is the Registry loading, and either one failing is the Registry failing.
const registryCalls = (
  calls: readonly Pick<RegistryRefresh, 'isPending' | 'isError'>[],
): Pick<Parameters<typeof registryLoad>[0], 'refreshing' | 'failed'> => ({
  refreshing: calls.some(({ isPending }) => isPending),
  failed: calls.some(({ isError }) => isError),
});

// The Registry copy the Server keeps, synced once on mount.
function useRegistry(): Registry {
  const query = useQuery(useTRPC().registry.get.queryOptions());
  const sync = useRegistryCall('sync');
  const refresh = useRegistryCall('refresh');
  const { mutate } = sync;
  useEffect(() => mutate(), [mutate]);

  const load = registryLoad({
    data: query.data,
    ...registryCalls([sync, refresh]),
  });

  return { load, refresh: () => refresh.mutate() };
}

export interface RegistryAgents extends AgentChanges {
  installed: InstalledAgents;
  // The Agents page rows, before its filter and search.
  page: AgentRows;
  // Loads the Registry and the Installed Agents again.
  retry: () => void;
}

// What useRegistryAgents shows, apart from its actions.
type RegistryAgentsData = Pick<RegistryAgents, 'installed' | 'page'>;

const registryAgentsData = (
  installed: InstalledAgents,
  registry: RegistryLoad,
): RegistryAgentsData => ({
  installed,
  page: agentsPage(installed, registry),
});

type RegistryEntry = AgentsRegistryOutput['agents'][number];

const registryEntry = (
  registry: RegistryLoad,
  id: string,
): RegistryEntry | undefined =>
  registry.status === 'loaded'
    ? registry.registry.agents.find(({ entry }) => entry.id === id)
    : undefined;

const registryName = (registry: RegistryLoad, id: string): string =>
  registryEntry(registry, id)?.entry.name ?? id;

// A finished install says so with a success toast naming the Agent.
const announceInstall =
  (registry: RegistryLoad, onInstalled?: (id: string) => void) =>
  (id: string): void => {
    showToast({
      title: `${registryName(registry, id)} installed`,
      tone: 'success',
    });
    onInstalled?.(id);
  };

/*
 * The Registry's Agents marked by what the Server has installed, with Install and Remove.
 * Mounting it refreshes the Registry, so only the surfaces that show the Registry use it.
 */
export function useRegistryAgents(
  onInstalled?: (id: string) => void,
): RegistryAgents {
  const query = useInstalledQuery();
  const registry = useRegistry();

  const retry = (): void => {
    registry.refresh();
    void query.refetch();
  };

  return {
    ...registryAgentsData(installedAgents(query), registry.load),
    ...useAgentChanges(announceInstall(registry.load, onInstalled)),
    retry,
  };
}
