import type * as React from 'react';
import { useServerPageCaption } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { PluginListView, pluginsTitle } from './plugin-list-view';
import { usePluginsLoad } from './use-plugins';

export function PluginListScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <>
      <ScreenHeader title={pluginsTitle} />
      <PluginListView
        caption={useServerPageCaption()}
        plugins={usePluginsLoad()}
        onOpenPlugin={(pluginId) => navigate(`/settings/plugins/${pluginId}`)}
      />
    </>
  );
}
