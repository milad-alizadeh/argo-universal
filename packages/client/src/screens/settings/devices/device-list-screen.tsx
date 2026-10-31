import type * as React from 'react';
import {
  PlaceholderDetailView,
  useServerPageCaption,
} from '#features/settings';
import { useServerPaired } from '#lib/product/server-place';
import { DeviceListView } from './device-list-view';
import { useLocalNetworkAccess } from './use-local-network-access';

// Local network access is Server-Device-only (ADR-0022), so a Device paired to another computer's Server is not shown the switch. The Server refuses it too once #1497 lands.
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
  return <DeviceListView {...useLocalNetworkAccess()} caption={caption} />;
}
