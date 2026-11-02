import type { ServerDevice } from '@repo/contracts';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import {
  type QueryClient,
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import type { DeviceDetailLoad } from './device-detail-view';
import {
  deviceRow,
  formatDay,
  platformName,
  seenLabel,
  type DeviceRow,
} from './device-rows';

// The Server's Devices, read only by the Server Device: a Paired Device is refused, and never asks (ServerDeviceList).
export function useDeviceRows(): readonly DeviceRow[] | undefined {
  const trpc = useTRPC();

  const list = useQuery({
    ...trpc.devices.list.queryOptions(),
    select: (devices) => devices.map((entry) => deviceRow(entry, Date.now())),
  });

  useErrorToast(errorToast('Could not load the Devices', list.error));

  return list.data;
}

function detailOf(
  devices: readonly ServerDevice[],
  deviceId: string,
  now: number,
): DeviceDetailLoad {
  const found = devices.find((entry) => entry.id === deviceId);

  if (!found || found.serverDevice) return { status: 'missing' };

  return {
    status: 'loaded',
    name: found.name,
    platform: platformName(found.platform),
    paired: formatDay(new Date(found.pairedAt)),
    seen: seenLabel(found.lastSeenAt, now),
  };
}

export function useDeviceDetail(deviceId: string): DeviceDetailLoad {
  const trpc = useTRPC();

  const list = useQuery({
    ...trpc.devices.list.queryOptions(),
    select: (devices) => detailOf(devices, deviceId, Date.now()),
  });

  useErrorToast(errorToast('Could not load the Device', list.error));

  return list.data ?? { status: 'loading' };
}

async function readAgain(
  cache: QueryClient,
  queryKey: QueryKey,
  onDone: () => void,
): Promise<void> {
  await cache.invalidateQueries({ queryKey });
  onDone();
}

// Unpairing deletes the row and closes the Device's Connection on the Server; the list is read again so the row is gone.
export function useUnpairDevice(onDone: () => void): (id: string) => void {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const listKey = trpc.devices.list.queryKey();

  const unpair = useMutation(
    trpc.devices.unpair.mutationOptions({
      onSuccess: () => readAgain(cache, listKey, onDone),
    }),
  );

  useErrorToast(errorToast('Could not unpair the Device', unpair.error));

  return (deviceId) => unpair.mutate({ deviceId });
}
