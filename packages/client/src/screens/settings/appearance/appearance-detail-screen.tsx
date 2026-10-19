import type * as React from 'react';
import { PlaceholderDetailView } from '#features/settings';

const title = 'Appearance';

export function AppearanceDetailScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title={title}
      description="Appearance will appear here."
    />
  );
}
