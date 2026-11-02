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
import { deviceRow, type DeviceRow } from './device-rows';

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

const readAgain = (cache: QueryClient, queryKey: QueryKey): Promise<void> =>
  cache.invalidateQueries({ queryKey });

// Unpairing deletes the row and closes the Device's Connection on the Server; the list is read again so the row is gone.
export function useUnpairDevice(): (id: string) => void {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const listKey = trpc.devices.list.queryKey();

  const unpair = useMutation(
    trpc.devices.unpair.mutationOptions({
      onSuccess: () => readAgain(cache, listKey),
    }),
  );

  useErrorToast(errorToast('Could not unpair the Device', unpair.error));

  return (deviceId) => unpair.mutate({ deviceId });
}
