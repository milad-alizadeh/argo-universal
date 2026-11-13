import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/navigation';
import { PluginPageDetailView } from '../../../../plugins/$path/plugin-page-detail-view';
import { usePluginEntries } from '../../use-plugins';

export interface PluginSignInDetailScreenProps {
  pluginId: string;
  page: string;
}

// Account pages are declared in the manifest; they need no nav item and open even when the Plugin has not started.
export function PluginSignInDetailScreen({
  pluginId,
  page,
}: PluginSignInDetailScreenProps): React.JSX.Element {
  const navigate = useNavigate();
  const { plugins } = usePluginEntries();
  const manifest = plugins?.find(
    (entry) => entry.manifest.id === pluginId,
  )?.manifest;
  return (
    <PluginPageDetailView
      pluginId={pluginId}
      path={page}
      title={manifest?.name ?? pluginId}
      onBack={() => navigate(`/settings/plugins/${pluginId}`)}
      onOpenPage={(path) =>
        navigate({
          pathname: '/settings/plugins/sign-in/[id]',
          params: { id: pluginId, page: path },
        })
      }
    />
  );
}
