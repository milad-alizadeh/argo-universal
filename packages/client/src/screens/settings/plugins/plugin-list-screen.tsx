import type * as React from 'react';
import { useServerPageCaption } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { PluginListView } from './plugin-list-view';
import { usePluginsLoad } from './use-plugins';

export function PluginListScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <PluginListView
      caption={useServerPageCaption()}
      plugins={usePluginsLoad()}
      onOpenPlugin={(pluginId) => navigate(`/settings/plugins/${pluginId}`)}
    />
  );
}
