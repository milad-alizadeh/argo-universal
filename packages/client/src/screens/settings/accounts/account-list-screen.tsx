import type * as React from 'react';
import { PlaceholderDetailView } from '#features/settings';
import { ScreenHeader } from '#lib/product/navigation/screen-header';

const title = 'Accounts';

// The Server has no accounts yet, so the page shows where they will go.
export function AccountListScreen(): React.JSX.Element {
  return (
    <>
      <ScreenHeader title={title} />
      <PlaceholderDetailView
        title={title}
        caption="What this App is talking to"
        description="Accounts will appear here."
      />
    </>
  );
}
