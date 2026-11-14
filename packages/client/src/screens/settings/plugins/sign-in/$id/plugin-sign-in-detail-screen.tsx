import { Redirect } from 'expo-router';
import type * as React from 'react';
import { z } from 'zod';
import { useNavigate } from '#lib/product/navigation/navigation';
import { PluginPageDetailView } from '../../../../plugins/$path/plugin-page-detail-view';
import { usePluginNames } from '../../../accounts/use-accounts';

export interface PluginSignInDetailScreenProps {
  pluginId: unknown;
  page: unknown;
}

const SignInParams = z.object({
  pluginId: z.string().min(1),
  page: z.string().startsWith('/'),
});

export function PluginSignInDetailScreen(
  props: PluginSignInDetailScreenProps,
): React.JSX.Element {
  const params = SignInParams.safeParse(props);

  return params.success ? (
    <SignInPage {...params.data} />
  ) : (
    <Redirect href="/settings/plugins" />
  );
}

// Account pages need no nav item; only following the row starts the Plugin.
function SignInPage({
  pluginId,
  page,
}: z.infer<typeof SignInParams>): React.JSX.Element {
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
