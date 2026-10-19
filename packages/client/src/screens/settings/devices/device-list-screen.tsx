import type * as React from 'react';
import {
  PlaceholderDetailView,
  useServerPageCaption,
} from '#features/settings';

const title = 'Devices';

// The Server has no pairing yet, so the page shows where Devices will go.
export function DeviceListScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title={title}
      caption={useServerPageCaption()}
      description="Devices will appear here."
    />
  );
}
