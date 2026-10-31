import type * as React from 'react';
import {
  PairDeviceSheet,
  pairingOffered,
  PlaceholderDetailView,
  usePairDevice,
} from '#features/settings';
import { useServerPaired } from '#lib/product/server-scope';
import { DeviceListView } from './device-list-view';
import { useLocalNetworkAccess } from './use-local-network-access';

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

function ServerDeviceList(): React.JSX.Element {
  const { onOpen, ...sheet } = usePairDevice();

  return <DeviceListView {...useLocalNetworkAccess()} {...pairing(onOpen, sheet)} />;
}

type Pairing = Pick<
  React.ComponentProps<typeof DeviceListView>,
  'pairingOffered' | 'pairDeviceSheet' | 'onPairDevice'
>;

const pairing = (
  onPairDevice: () => void,
  sheet: React.ComponentProps<typeof PairDeviceSheet>,
): Pairing => ({
  pairingOffered: pairingOffered(),
  onPairDevice,
  pairDeviceSheet: <PairDeviceSheet {...sheet} />,
});
