import type * as React from 'react';
import {
  PlaceholderDetailView,
  useServerPageCaption,
} from '#features/settings';
import { settingsTitles } from '../../../lib/product/navigation/settings-titles';

// The Server has no pairing yet, so the page shows where Devices will go.
export function DevicesScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title={settingsTitles.devices}
      caption={useServerPageCaption()}
      description="Devices will appear here."
    />
  );
}
