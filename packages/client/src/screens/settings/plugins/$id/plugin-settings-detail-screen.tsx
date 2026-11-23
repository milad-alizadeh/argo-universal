import type { PluginSettings } from '@repo/contracts/plugins';
import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useTRPC } from '#features/connection';
import { type PluginEntry, usePluginEntries } from '#features/plugins';
import {
  useScreenFocused,
  useNavigate,
} from '#lib/product/navigation/navigation';
import { usePluginEnabledChange, usePluginSettingChange } from '../use-plugins';
import {
  type PluginSettingsDetailViewProps,
  type PluginLoad,
  PluginSettingsDetailView,
} from './plugin-settings-detail-view';
import { useGitHubAccount, type GitHubAccount } from './use-github-account';

export interface PluginSettingsDetailScreenProps {
  pluginId: string;
}

const loading: PluginLoad = { status: 'loading' };

function toPluginLoad(
  plugins: PluginEntry[] | undefined,
  plugin: PluginEntry | undefined,
  {
    settings,
    accounts,
    github,
  }: {
    settings: PluginSettings | undefined;
    accounts: PluginAccount[] | undefined;
    github: GitHubAccount | undefined;
  },
): PluginLoad {
  if (!plugins) return loading;

  if (!plugin) return { status: 'missing' };

  if (!settings || !accounts) return loading;

  return {
    status: 'loaded',
    enabled: plugin.enabled,
    fields: plugin.manifest.contributes.settings ?? [],
    settings,
    accounts: signInRows(plugin.manifest, accounts),
    github,
  };
}

function signInRows(
  manifest: PluginEntry['manifest'],
  accounts: PluginAccount[],
): Extract<PluginLoad, { status: 'loaded' }>['accounts'] {
  return (manifest.contributes.accounts ?? []).flatMap(({ host, page }) => {
    const provided = accounts.filter(
      (account) => account.host === host && account.providedBy === manifest.id,
    );

    return provided.length
      ? provided.map((account) => ({ host, page, account }))
      : [{ host, page }];
  });
}

function usePluginLoad(pluginId: string): PluginLoad & { name?: string } {
  const { plugins } = usePluginEntries();
  const plugin = plugins?.find((entry) => entry.manifest.id === pluginId);

  const settings = useSettingsQuery(pluginId, plugin !== undefined);

  const accounts = useAccountsQuery();
  const github = useGitHubAccount(pluginId, plugins, accounts.data);

  return {
    ...toPluginLoad(plugins, plugin, {
      settings: settings.data,
      accounts: accounts.data,
      github,
    }),
    name: plugin?.manifest.name,
  };
}

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function useSettingsQuery(
  pluginId: string,
  found: boolean,
): { data: PluginSettings | undefined } {
  const settings = useQuery(
    useTRPC().plugin.getSettings.queryOptions({ pluginId }),
  );

  useErrorToast(
    errorToast(
      'Could not load the settings',
      found ? settings.error : undefined,
    ),
  );

  return settings;
}

function usePluginDetail(pluginId: string): PluginSettingsDetailViewProps {
  const links = useAccountLinks(pluginId);
  const { name, ...plugin } = usePluginLoad(pluginId);

  return {
    title: name ?? pluginId,
    plugin,
    onEnabledChange: usePluginEnabledChange(pluginId),
    onSettingChange: usePluginSettingChange(pluginId),
    ...links,
  };
}

type AccountLinks = Pick<
  PluginSettingsDetailViewProps,
  'onBack' | 'onOpenAccount' | 'onOpenSignIn'
>;

function useAccountLinks(pluginId: string): AccountLinks {
  const navigate = useNavigate();

  return {
    onBack: () => navigate('/settings/plugins'),
    onOpenAccount: (id) => navigate(`/settings/accounts/${id}`),
    onOpenSignIn: (page, providerId = pluginId) =>
      navigate({
        pathname: '/settings/plugins/sign-in/[id]',
        params: { id: providerId, page, from: pluginId },
      }),
  };
}

export function PluginSettingsDetailScreen({
  pluginId,
}: PluginSettingsDetailScreenProps): React.JSX.Element {
  const props = usePluginDetail(pluginId);

  return <PluginSettingsDetailView {...props} />;
}

function useAccountsQuery(): { data: PluginAccount[] | undefined } {
  const focused = useScreenFocused();

  const accounts = useQuery({
    ...useTRPC().plugins.accounts.list.queryOptions(),
    enabled: focused,
    subscribed: focused,
  });

  useErrorToast(errorToast('Could not load Accounts', accounts.error));

  return accounts;
}
