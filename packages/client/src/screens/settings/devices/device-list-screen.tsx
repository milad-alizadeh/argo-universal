import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useTRPC } from '#features/connection';
import {
  PairDeviceSheet,
  pairingOffered,
  PlaceholderDetailView,
  usePairDevice,
} from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useServerPaired } from '#lib/product/server-scope';
import { DeviceListView } from './device-list-view';
import { useDeviceRows, useUnpairDevice } from './use-devices';

/*
 * The Devices of the Server being looked at. A paired Device never sees the other Devices, and Local network access is
 * Server-Device-only (ADR-0022), so it is shown neither: the Settings list leaves the row out, and a link straight to
 * the page lands here. The reads live in the child so a paired Device never even asks; hiding a row in the App is not
 * the check either way, since the Server refuses the call with `serverDeviceProcedure`.
 */
export function DeviceListScreen(): React.JSX.Element {
  if (useServerPaired())
    return (
      <PlaceholderDetailView
        title="Devices"
        description="Only the computer this Server runs on lists its Devices."
      />
    );

  return <ServerDeviceList />;
}

// Pairing needs Local network access, which the Connection page switches; here it is only read.
function useAccessEnabled(): boolean | undefined {
  const trpc = useTRPC();

  return useQuery(trpc.network.localAccess.queryOptions()).data?.enabled;
}

function ServerDeviceList(): React.JSX.Element {
  const { onOpen, ...sheet } = usePairDevice();
  const navigate = useNavigate();

  return (
    <DeviceListView
      devices={useDeviceRows()}
      accessEnabled={useAccessEnabled()}
      pairingOffered={pairingOffered()}
      pairDeviceSheet={<PairDeviceSheet {...sheet} />}
      onPairDevice={onOpen}
      onUnpairDevice={useUnpairDevice()}
      onGoToConnection={() => navigate('/settings/connection')}
    />
  );
}
