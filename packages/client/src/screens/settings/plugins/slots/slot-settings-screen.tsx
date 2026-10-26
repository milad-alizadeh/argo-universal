import type * as React from 'react';
import {
  useSessionRowChoices,
  useSessionRowChoosers,
} from '#features/sessions';
import { useServerPageCaption } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useSessionRowsPlugins } from './session-rows-plugins';
import { SessionRowsView } from './session-rows-view';

// Both choices are this Device's; a Plugin draws the Activity line once Session rows ask Plugins for it (#1126).
export function SessionRowsScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <SessionRowsView
      caption={useServerPageCaption()}
      plugins={useSessionRowsPlugins()}
      activityOwner={useSessionRowChoices().activityOwner}
      {...useSessionRowChoosers()}
      onBack={() => navigate('/settings/plugins')}
    />
  );
}
