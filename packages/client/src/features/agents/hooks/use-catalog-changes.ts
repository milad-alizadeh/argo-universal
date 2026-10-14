import { type QueryFilters, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

type CatalogChanges = {
  filter: QueryFilters;
  onChange?: () => void;
};

// The Server's Agent catalog changed: refetch the queries the filter matches; a failed subscription restarts when the Connection reopens.
export function useCatalogChanges({ filter, onChange }: CatalogChanges): void {
  const trpc = useTRPC();
  const cache = useQueryClient();

  const update = (): void => {
    onChange?.();
    void cache.invalidateQueries(filter);
  };

  const subscription = useSubscription(
    trpc.agents.catalogChanges.subscriptionOptions(undefined, {
      onStarted: update,
      onData: update,
    }),
  );

  useResubscribeOnReconnect(subscription);
}
