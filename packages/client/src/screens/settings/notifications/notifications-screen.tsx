import type * as React from 'react';
import { PlaceholderDetailView } from '#features/settings';
import { settingsTitles } from '../../../lib/product/navigation/settings-titles';

// The Server sends no notifications yet, so the page shows where they will go.
export function NotificationsScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title={settingsTitles.notifications}
      description="Notifications will appear here."
    />
  );
}
