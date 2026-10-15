import type * as React from 'react';
import { PlaceholderDetailView } from '#features/settings';
import { settingsTitles } from '../../../lib/product/navigation/settings-titles';

export function AppearanceDetailScreen(): React.JSX.Element {
  return (
    <PlaceholderDetailView
      title={settingsTitles.appearance}
      description="Appearance will appear here."
    />
  );
}
