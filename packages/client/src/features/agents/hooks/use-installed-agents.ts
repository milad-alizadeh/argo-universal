import type { AgentServer, AgentsRegistryOutput } from '@repo/contracts';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTRPC, type ClientError } from '#features/connection';
import {
  type AgentRows,
  agentsPage,
  featuredAgents,
} from '../state/agent-rows';
import {
  type InstalledAgents,
  installedAgents,
  type RegistryLoad,
  registryLoad,
} from '../state/installed-agents';
import {
  type AgentChanges,
  useAgentChanges,
  useInstalledInvalidation,
} from './use-agent-changes';

export const registryError =
  'Failed to load the Agent Registry. Please check your connection and try again.';

export const installedError = 'Failed to load installed Agents.';

function useInstalledQuery(): UseQueryResult<AgentServer[], ClientError> {
  return useQuery(useTRPC().agents.servers.queryOptions());
}

// The Server's Installed Agents, in name order; loading is a status, never an empty list.
export function useInstalledAgents(): InstalledAgents {
  return installedAgents(useInstalledQuery());
}

type RegistryRefresh = UseMutationResult<
  AgentsRegistryOutput,
  ClientError,
  void
>;

// A refreshed Registry can change which Installed Agents the Server lists.
function useRegistryRefresh(): RegistryRefresh {
  const trpc = useTRPC(),
    cache = useQueryClient(),
    invalidate = useInstalledInvalidation();

  const onSuccess = (data: AgentsRegistryOutput): void => {
    cache.setQueryData(trpc.agents.registry.queryKey(), data);
    void invalidate();
  };

  return useMutation(
    trpc.agents.refreshRegistry.mutationOptions({ onSuccess }),
  );
}

interface Registry {
  load: RegistryLoad;
  refresh: () => void;
}

// The Registry copy the Server keeps, refreshed once on mount.
function useRegistry(): Registry {
  const query = useQuery(useTRPC().agents.registry.queryOptions());
  const refresh = useRegistryRefresh();
  const { mutate } = refresh;
  useEffect(() => mutate(), [mutate]);

  const load = registryLoad({
    data: query.data,
    refreshing: refresh.isPending,
    failed: query.isError || refresh.isError,
  });

  return { load, refresh: () => mutate() };
}

export interface RegistryAgents extends AgentChanges {
  installed: InstalledAgents;
  // The Agents page rows, before its filter and search.
  page: AgentRows;
  // Get started's featured tiles.
  featured: AgentRows;
  // Loads the Registry and the Installed Agents again.
  retry: () => void;
}

// What useRegistryAgents shows, apart from its actions.
type RegistryAgentsData = Pick<
  RegistryAgents,
  'installed' | 'page' | 'featured'
>;

const registryAgentsData = (
  installed: InstalledAgents,
  registry: RegistryLoad,
): RegistryAgentsData => ({
  installed,
  page: agentsPage(installed, registry),
  featured: featuredAgents(installed, registry),
});

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
    ...useAgentChanges(onInstalled),
    retry,
  };
}
