import type * as React from 'react';
import { PlaceholderDetailView } from '#features/settings';
import { ScreenHeader } from '#lib/product/navigation/screen-header';

const title = 'Notifications';

// The Server sends no notifications yet, so the page shows where they will go.
export function NotificationsDetailScreen(): React.JSX.Element {
  return (
    <>
      <ScreenHeader title={title} />
      <PlaceholderDetailView
        title={title}
        description="Notifications will appear here."
      />
    </>
  );
}
