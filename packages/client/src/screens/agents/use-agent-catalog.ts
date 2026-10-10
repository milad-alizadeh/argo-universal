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
  syncError: ClientError | null;
}

export function useAgentCatalog(search: string): AgentCatalogState {
  const query = useQuery(
    useTRPC().agents.catalog.queryOptions(
      { search },
      { placeholderData: keepPreviousData },
    ),
  );
  const refresh = useCatalogSync();
  return {
    query,
    refresh: (): void => refresh.mutate(),
    refreshing: refresh.isPending || isCatalogSyncing(query.data),
    syncError: refresh.error,
  };
}

function isCatalogSyncing(catalog: AgentsCatalogOutput | undefined): boolean {
  return catalog ? ['pending', 'running'].includes(catalog.syncStatus) : false;
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
  useCatalogChanges(sync);
  const { mutate } = sync;
  useEffect(() => mutate(), [mutate]);
  return sync;
}

function useCatalogInvalidation(): () => void {
  const trpc = useTRPC();
  const cache = useQueryClient();
  return (): void => {
    void cache.invalidateQueries(trpc.agents.catalog.queryFilter());
  };
}

interface CatalogSyncReset {
  error: ClientError | null;
  reset: () => void;
}

function useCatalogChanges(sync: CatalogSyncReset): void {
  const trpc = useTRPC();
  const invalidate = useCatalogInvalidation();
  const update = (): void => {
    if (sync.error) sync.reset();
    invalidate();
  };
  useSubscription(
    trpc.agents.catalogChanges.subscriptionOptions(undefined, {
      onStarted: update,
      onData: update,
    }),
  );
}
