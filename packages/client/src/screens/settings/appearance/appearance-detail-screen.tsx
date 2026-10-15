import type * as React from 'react';
import { PlaceholderDetailView } from '#features/settings';
import { ScreenHeader } from '#lib/product/navigation/screen-header';

const title = 'Appearance';

export function AppearanceDetailScreen(): React.JSX.Element {
  return (
    <>
      <ScreenHeader title={title} />
      <PlaceholderDetailView
        title={title}
        description="Appearance will appear here."
      />
    </>
  );
}
