import type { AgentsCatalogSyncOutput } from '@repo/contracts';
import {
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  focusManager,
} from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect, useEffectEvent } from 'react';
import type { ClientError } from '#features/connection';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import {
  applyCatalogSync,
  type CatalogSync,
  catalogFailed,
} from '../state/catalog-sync';

const messageOf = (error: ClientError | null): string | null =>
  error === null ? null : error.message;

// The whole catalog; the Agents page filters and searches it on the device.
export function useAgentCatalog(): CatalogSync {
  const catalogQuery = useTRPC().agents.catalog.queryOptions(undefined, {
    placeholderData: keepPreviousData,
  });
  const query = useQuery(catalogQuery);
  const refresh = useCatalogSync();
  const sync = applyCatalogSync(
    { catalog: query.data, error: messageOf(query.error) },
    { pending: refresh.isPending, error: messageOf(refresh.error) },
  );
  useRetryOnReturn(catalogFailed(sync) && !sync.refreshing, refresh.mutate);
  return sync;
}

// A failed sync tries again when the Connection reopens or the window regains focus, as failed queries do.
function useRetryOnReturn(failed: boolean, retry: () => void): void {
  useResubscribeOnReconnect({
    status: failed ? 'error' : 'idle',
    reset: retry,
  });
  useRetryOnFocus(failed, retry);
}

function useRetryOnFocus(failed: boolean, retry: () => void): void {
  const retryIfFailed = useEffectEvent(() => {
    if (failed) retry();
  });
  useEffect(
    () =>
      focusManager.subscribe((focused) => {
        if (focused) retryIfFailed();
      }),
    [],
  );
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
