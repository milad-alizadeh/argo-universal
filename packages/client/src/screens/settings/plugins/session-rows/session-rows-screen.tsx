import type * as React from 'react';
import { useState } from 'react';
import {
  useHiddenSessionRowPlugins,
  useSessionRowPluginShown,
} from '#features/sessions';
import { useServerPageCaption } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { usePluginEntries } from '../use-plugins';
import type { ActivityOwner } from './session-rows-model';
import { toSessionRowsPlugins } from './session-rows-plugins';
import { SessionRowsView, type SessionRowsLoad } from './session-rows-view';

function useSessionRowsLoad(): SessionRowsLoad {
  const { plugins, isError } = usePluginEntries();
  const hidden = useHiddenSessionRowPlugins();

  if (!plugins) return { status: isError ? 'error' : 'loading' };

  return { status: 'loaded', plugins: toSessionRowsPlugins(plugins, hidden) };
}

// Nothing asks for the Activity line yet, so it stays Argo's; the choice is held here until a Plugin can ask.
export function SessionRowsScreen(): React.JSX.Element {
  const navigate = useNavigate();
  const [activityOwner, setActivityOwner] = useState<ActivityOwner>(null);

  return (
    <SessionRowsView
      caption={useServerPageCaption()}
      plugins={useSessionRowsLoad()}
      activityOwner={activityOwner}
      onShownChange={useSessionRowPluginShown()}
      onActivityOwnerChange={setActivityOwner}
      onBack={() => navigate('/settings/plugins')}
    />
  );
}
