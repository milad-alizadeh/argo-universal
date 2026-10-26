import type * as React from 'react';
import { useServerPageCaption } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { PluginListView } from './plugin-list-view';
import { shownCount } from './session-rows/session-rows-model';
import { useSessionRowsPlugins } from './session-rows/session-rows-plugins';
import { usePluginsLoad } from './use-plugins';

// How many Plugins add to Session rows, once the Server has answered and one can.
function useSessionRowPluginCount(): number | undefined {
  const load = useSessionRowsPlugins();

  if (load.status !== 'loaded' || load.plugins.length === 0) return undefined;

  return shownCount(load.plugins);
}

export function PluginListScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <PluginListView
      caption={useServerPageCaption()}
      plugins={usePluginsLoad()}
      sessionRowPluginCount={useSessionRowPluginCount()}
      onOpenPlugin={(pluginId) => navigate(`/settings/plugins/${pluginId}`)}
      onOpenSessionRows={() => navigate('/settings/plugins/session-rows')}
    />
  );
}
