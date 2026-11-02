import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { useServerPaired } from '#lib/product/server-scope';
import type { KeepRunningSetting } from './connection-detail-view';
import { keepRunningSetting } from './keep-running-setting';

// The Server answers the setting to the Server Device alone, so a Paired Device never asks.
function useStoredKeepRunning(paired: boolean): boolean | undefined {
  const trpc = useTRPC();

  const stored = useQuery({
    ...trpc.system.keepRunning.queryOptions(),
    enabled: !paired,
  });

  return stored.data?.enabled;
}

export function useKeepRunning(): KeepRunningSetting | undefined {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const paired = useServerPaired();

  const change = useMutation(
    trpc.system.setKeepRunning.mutationOptions({
      onSuccess: (data) =>
        cache.setQueryData(trpc.system.keepRunning.queryKey(), data),
    }),
  );

  return keepRunningSetting(paired, useStoredKeepRunning(paired), change);
}
