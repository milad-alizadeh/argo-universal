import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/navigation';
import { ComposerDetailView } from './composer-detail-view';
import { useComposerSettings } from './use-composer-settings';

export function ComposerDetailScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <ComposerDetailView
      {...useComposerSettings()}
      onBack={() => navigate('/settings')}
    />
  );
}
