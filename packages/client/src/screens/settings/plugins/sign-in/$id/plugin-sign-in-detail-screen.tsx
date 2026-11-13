import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/navigation';
import { PluginPageDetailView } from '../../../../plugins/$path/plugin-page-detail-view';
import { usePluginNames } from '../../../accounts/use-accounts';

export interface PluginSignInDetailScreenProps {
  pluginId: string;
  page: string;
}

// Account pages need no nav item; only following the row starts the Plugin.
export function PluginSignInDetailScreen({
  pluginId,
  page,
}: PluginSignInDetailScreenProps): React.JSX.Element {
  const title = usePluginNames()(pluginId);
  const links = useSignInLinks(pluginId);

  return (
    <PluginPageDetailView
      pluginId={pluginId}
      path={page}
      title={title}
      {...links}
    />
  );
}

type SignInLinks = Pick<
  React.ComponentProps<typeof PluginPageDetailView>,
  'onBack' | 'onOpenPage'
>;

function useSignInLinks(pluginId: string): SignInLinks {
  const navigate = useNavigate();

  return {
    onBack: () => navigate(`/settings/plugins/${pluginId}`),
    onOpenPage: (page: string) =>
      navigate({
        pathname: '/settings/plugins/sign-in/[id]',
        params: { id: pluginId, page },
      }),
  };
}
