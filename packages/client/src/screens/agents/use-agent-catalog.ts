import type {
  AgentsCatalogOutput,
  AgentsCatalogSyncOutput,
} from '@repo/contracts';
import {
  type UseQueryResult,
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect } from 'react';
import type { ClientError } from '../../trpc/context';
import { useTRPC } from '../../trpc/context';

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
  const refresh = useCatalogSync();
  return {
    query,
    refresh: (): void => refresh.mutate(),
    refreshing: refresh.isPending,
  };
}

function useCatalogSync(): UseMutationResult<
  AgentsCatalogSyncOutput,
  ClientError,
  void
> {
  const trpc = useTRPC();
  const invalidate = useCatalogInvalidation();
  const sync = useMutation(
    trpc.agents.syncCatalog.mutationOptions({ onSettled: invalidate }),
  );
  const { mutate } = sync;
  useEffect(() => mutate(), [mutate]);
  return sync;
}

function useCatalogInvalidation(): () => void {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const invalidate = (): void => {
    void cache.invalidateQueries(trpc.agents.catalog.queryFilter());
  };
  useSubscription(
    trpc.agents.catalogChanges.subscriptionOptions(undefined, {
      onStarted: invalidate,
      onData: invalidate,
    }),
  );
  return invalidate;
}
