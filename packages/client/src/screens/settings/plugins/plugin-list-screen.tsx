import type * as React from 'react';
import { useHiddenSessionRowPlugins } from '#features/sessions';
import { useServerPageCaption } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { PluginListView } from './plugin-list-view';
import { shownCount } from './session-rows/session-rows-model';
import { toSessionRowsPlugins } from './session-rows/session-rows-plugins';
import { usePluginEntries, usePluginsLoad } from './use-plugins';

// How many Plugins add to Session rows, once the Server has answered and one can.
function useSessionRowPluginCount(): number | undefined {
  const { plugins } = usePluginEntries();
  const hidden = useHiddenSessionRowPlugins();

  if (!plugins) return undefined;

  const filling = toSessionRowsPlugins(plugins, hidden);

  return filling.length === 0 ? undefined : shownCount(filling);
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
