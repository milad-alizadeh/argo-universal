import type * as React from 'react';
import {
  PlaceholderDetailView,
  useServerPageCaption,
} from '#features/settings';
import { ScreenHeader } from '#lib/product/navigation/screen-header';

const title = 'Devices';

// The Server has no pairing yet, so the page shows where Devices will go.
export function DeviceListScreen(): React.JSX.Element {
  return (
    <>
      <ScreenHeader title={title} />
      <PlaceholderDetailView
        title={title}
        caption={useServerPageCaption()}
        description="Devices will appear here."
      />
    </>
  );
}
