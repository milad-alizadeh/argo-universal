import type { PluginSettings } from '@repo/contracts/plugins';
import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useTRPC } from '#features/connection';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import { useNavigate } from '#lib/product/navigation/navigation';
import {
  type PluginEntry,
  usePluginEnabledChange,
  usePluginEntries,
  usePluginSettingChange,
} from '../use-plugins';
import {
  type PluginSettingsDetailViewProps,
  type PluginLoad,
  PluginSettingsDetailView,
} from './plugin-settings-detail-view';

export interface PluginSettingsDetailScreenProps {
  pluginId: string;
}

const loading: PluginLoad = { status: 'loading' };

function toPluginLoad(
  plugins: PluginEntry[] | undefined,
  plugin: PluginEntry | undefined,
  settings: PluginSettings | undefined,
  accounts: PluginAccount[] | undefined,
): PluginLoad {
  if (!plugins) return loading;

  return plugin
    ? foundPlugin(plugin, settings, accounts)
    : { status: 'missing' };
}

const foundPlugin = (
  plugin: PluginEntry,
  settings: PluginSettings | undefined,
  accounts: PluginAccount[] | undefined,
): PluginLoad =>
  settings && accounts ? loadedPlugin(plugin, settings, accounts) : loading;

const loadedPlugin = (
  { enabled, manifest }: PluginEntry,
  settings: PluginSettings,
  accounts: PluginAccount[],
): PluginLoad => ({
  status: 'loaded',
  enabled,
  fields: manifest.contributes.settings ?? [],
  settings,
  accounts: (manifest.contributes.accounts ?? []).flatMap(({ host, page }) => {
    const provided = accounts.filter(
      (account) => account.host === host && account.providedBy === manifest.id,
    );
    return provided.length
      ? provided.map((account) => ({ host, page, account }))
      : [{ host, page }];
  }),
});

function usePluginLoad(pluginId: string): PluginLoad & { name?: string } {
  const { plugins } = usePluginEntries();
  const plugin = plugins?.find((entry) => entry.manifest.id === pluginId);

  const settings = useSettingsQuery(pluginId, plugin !== undefined);
  const accounts = useQuery({
    ...useTRPC().plugins.accounts.list.queryOptions(),
    subscribed: useScreenFocused(),
  });
  useErrorToast(errorToast('Could not load Accounts', accounts.error));

  return {
    ...toPluginLoad(plugins, plugin, settings.data, accounts.data),
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
  const navigate = useNavigate();
  const { name, ...plugin } = usePluginLoad(pluginId);

  return {
    title: name ?? pluginId,
    plugin,
    onEnabledChange: usePluginEnabledChange(pluginId),
    onSettingChange: usePluginSettingChange(pluginId),
    onBack: () => navigate('/settings/plugins'),
    onOpenAccount: (id) => navigate(`/settings/accounts/${id}`),
    onOpenSignIn: (page) =>
      navigate({
        pathname: '/settings/plugins/sign-in/[id]',
        params: { id: pluginId, page },
      }),
  };
}

export function PluginSettingsDetailScreen({
  pluginId,
}: PluginSettingsDetailScreenProps): React.JSX.Element {
  const props = usePluginDetail(pluginId);

  return <PluginSettingsDetailView {...props} />;
}
