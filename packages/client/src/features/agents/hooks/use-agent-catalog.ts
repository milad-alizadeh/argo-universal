import type { AgentsRegistryOutput } from '@repo/contracts';
import {
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTRPC, type ClientError } from '#features/connection';

export type CatalogLoad =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; catalog: AgentsRegistryOutput };

export type AgentCatalog = { load: CatalogLoad; retry: () => void };

export const registryError =
  'Failed to load the Agent Registry. Please check your connection and try again.';

function useRegistryRefresh(): UseMutationResult<
  AgentsRegistryOutput,
  ClientError,
  void
> {
  const trpc = useTRPC(),
    cache = useQueryClient();

  const onSuccess = (data: AgentsRegistryOutput): void => {
    cache.setQueryData(trpc.agents.registry.queryKey(), data);
    void cache.invalidateQueries(trpc.agents.servers.queryFilter());
  };

  return useMutation(
    trpc.agents.refreshRegistry.mutationOptions({ onSuccess }),
  );
}

export function useAgentCatalog(): AgentCatalog {
  const query = useQuery(useTRPC().agents.registry.queryOptions());
  const refresh = useRegistryRefresh();
  const { mutate } = refresh;
  useEffect(() => mutate(), [mutate]);

  return {
    load: registryLoad(
      query.data,
      refresh.isPending,
      query.isError || refresh.isError,
    ),
    retry: () => mutate(),
  };
}

const storedRegistry = (
  catalog: AgentsRegistryOutput | undefined,
): catalog is AgentsRegistryOutput => Boolean(catalog?.agents.length);

const failedRegistry = (
  catalog: AgentsRegistryOutput | undefined,
  failed: boolean,
): boolean => failed || Boolean(catalog?.error);

const registryLoad = (
  catalog: AgentsRegistryOutput | undefined,
  pending: boolean,
  failed: boolean,
): CatalogLoad => {
  if (storedRegistry(catalog)) return { status: 'loaded', catalog };

  return pending ? { status: 'loading' } : settledRegistry(catalog, failed);
};

const settledRegistry = (
  catalog: AgentsRegistryOutput | undefined,
  failed: boolean,
): CatalogLoad => {
  if (failedRegistry(catalog, failed)) return { status: 'failed' };

  return catalog ? { status: 'loaded', catalog } : { status: 'loading' };
};
