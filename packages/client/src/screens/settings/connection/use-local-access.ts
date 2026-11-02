import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ServerMutation, type TRPC, useTRPC } from '#features/connection';
import { useServerPaired } from '#lib/product/server-scope';
import type { LocalAccessSetting } from './connection-controls';
import { localAccessSetting } from './local-access-setting';

// The Server answers Local network access to the Server Device alone, so a Paired Device never asks (ADR-0022).
function useStoredAccess(paired: boolean): boolean | undefined {
  const trpc = useTRPC();

  const stored = useQuery({
    ...trpc.network.localAccess.queryOptions(),
    enabled: !paired,
  });

  return stored.data?.enabled;
}

// What other Devices find this computer as: the name on the Server Device's own row of the Devices list.
function useComputerName(paired: boolean): string | undefined {
  const trpc = useTRPC();

  const list = useQuery({
    ...trpc.devices.list.queryOptions(),
    enabled: !paired,
    select: (devices) => devices.find((entry) => entry.serverDevice)?.name,
  });

  return list.data;
}

function useAccessChange(): ServerMutation<TRPC['network']['setLocalAccess']> {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return useMutation(
    trpc.network.setLocalAccess.mutationOptions({
      onSuccess: (data) =>
        cache.setQueryData(trpc.network.localAccess.queryKey(), data),
    }),
  );
}

export function useLocalAccess(): LocalAccessSetting | undefined {
  const paired = useServerPaired();

  const known = {
    stored: useStoredAccess(paired),
    computerName: useComputerName(paired),
  };

  return localAccessSetting(paired, known, useAccessChange());
}
