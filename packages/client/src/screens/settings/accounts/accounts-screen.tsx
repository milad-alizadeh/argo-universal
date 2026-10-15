import type * as React from 'react';
import { PlaceholderDetailView } from '#features/settings';
import { settingsTitles } from '../../../lib/product/navigation/settings-titles';

// The Server has no accounts yet, so the page shows where they will go.
export function AccountsScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title={settingsTitles.accounts}
      caption="What this App is talking to"
      description="Accounts will appear here."
    />
  );
}
