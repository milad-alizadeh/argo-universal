import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { useServerPaired } from '#lib/product/server-place';
import type { KeepRunningSetting } from './connection-detail-view';
import { keepRunningSetting } from './keep-running-setting';

export function useKeepRunning(): KeepRunningSetting | undefined {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const current = useQuery(trpc.system.keepRunning.queryOptions());

  const change = useMutation(
    trpc.system.setKeepRunning.mutationOptions({
      onSuccess: (data) =>
        cache.setQueryData(trpc.system.keepRunning.queryKey(), data),
    }),
  );

  return keepRunningSetting(useServerPaired(), current.data?.enabled, change);
}
