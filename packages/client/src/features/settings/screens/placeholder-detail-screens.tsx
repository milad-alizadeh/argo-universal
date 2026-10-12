import type * as React from 'react';
import { PlaceholderDetailView } from '../components/placeholder-detail-view';
import { useServerPageCaption } from '../hooks/use-server-caption';

// The Server has no accounts, pairing or notifications yet, so these pages show where they will go.
export function AccountsScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title="Accounts"
      caption="What this App is talking to"
      description="Accounts will appear here."
    />
  );
}

export function DevicesScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title="Devices"
      caption={useServerPageCaption()}
      description="Devices will appear here."
    />
  );
}

export function AppearanceScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title="Appearance"
      description="Appearance will appear here."
    />
  );
}

export function NotificationsScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title="Notifications"
      description="Notifications will appear here."
    />
  );
}
