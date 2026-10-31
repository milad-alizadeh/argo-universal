import type * as React from 'react';
import {
  PairDeviceSheet,
  pairingOffered,
  PlaceholderDetailView,
  usePairDevice,
  useServerPageCaption,
} from '#features/settings';
import { useServerPaired } from '#lib/product/server-place';
import { DeviceListView } from './device-list-view';
import { useLocalNetworkAccess } from './use-local-network-access';

// Local network access is Server-Device-only (ADR-0022), so a Device paired to another computer's Server is not shown the switch, and the Server refuses it with `serverDeviceProcedure` whatever the App draws.
export function DeviceListScreen(): React.JSX.Element {
  const caption = useServerPageCaption();

  if (useServerPaired())
    return (
      <PlaceholderDetailView
        title="Devices"
        caption={caption}
        description="Devices will appear here."
      />
    );

  return <ServerDeviceList caption={caption} />;
}

function ServerDeviceList({
  caption,
}: {
  caption: string | undefined;
}): React.JSX.Element {
  const { onOpen, ...sheet } = usePairDevice();

  return (
    <DeviceListView
      {...useLocalNetworkAccess()}
      {...pairing(onOpen, sheet)}
      caption={caption}
    />
  );
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
