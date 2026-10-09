import type { AgentsCatalogOutput } from '@repo/contracts';
import {
  type UseQueryResult,
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import type { ClientError } from '../../trpc/context';
import { useTRPC, useTRPCClient } from '../../trpc/context';

export interface AgentCatalogState {
  query: UseQueryResult<AgentsCatalogOutput, ClientError>;
  refresh: () => void;
  refreshing: boolean;
}

export function useAgentCatalog(search: string): AgentCatalogState {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.agents.catalog.queryOptions(
      { search },
      { placeholderData: keepPreviousData },
    ),
  );
  const refresh = useCatalogRefresh(search);
  return {
    query,
    refresh: (): void => refresh.mutate(),
    refreshing: refresh.isPending,
  };
}

function useCatalogRefresh(
  search: string,
): UseMutationResult<AgentsCatalogOutput, ClientError, void> {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: () => client.agents.catalog.query({ search, refresh: true }),
    onSuccess: (catalog) =>
      cache.setQueryData(trpc.agents.catalog.queryKey({ search }), catalog),
  });
}
