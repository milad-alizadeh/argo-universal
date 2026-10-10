import type { AgentsCatalogSyncOutput } from '@repo/contracts';
import {
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect } from 'react';
import type { ClientError } from '#features/connection';
import { useTRPC } from '#features/connection';
import { applyCatalogSync, type CatalogSync } from '../state/catalog-sync';

export type AgentCatalogState = CatalogSync & { refresh: () => void };

const messageOf = (error: ClientError | null): string | null =>
  error === null ? null : error.message;

export function useAgentCatalog(search: string): AgentCatalogState {
  const catalogQuery = useTRPC().agents.catalog.queryOptions(
    { search },
    { placeholderData: keepPreviousData },
  );
  const query = useQuery(catalogQuery);
  const refresh = useCatalogSync();
  const sync = applyCatalogSync(
    { catalog: query.data, error: messageOf(query.error) },
    { pending: refresh.isPending, error: messageOf(refresh.error) },
  );
  return { ...sync, refresh: (): void => refresh.mutate() };
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
