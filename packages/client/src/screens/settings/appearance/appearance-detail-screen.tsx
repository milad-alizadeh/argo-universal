import type * as React from 'react';
import { systemThemeSource, useThemeChoice } from '#features/settings';
import { AppearanceDetailView } from './appearance-detail-view';

export function AppearanceDetailScreen(): React.JSX.Element {
  const { choice, choose } = useThemeChoice();

  return (
    <AppearanceDetailView
      theme={choice}
      onThemeChange={choose}
      systemSource={systemThemeSource()}
    />
  );
}
