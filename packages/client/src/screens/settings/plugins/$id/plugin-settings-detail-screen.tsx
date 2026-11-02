import type { PluginSettings } from '@repo/contracts/plugins';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useTRPC } from '#features/connection';
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
): PluginLoad {
  if (!plugins) return loading;

  return plugin ? foundPlugin(plugin, settings) : { status: 'missing' };
}

const foundPlugin = (
  plugin: PluginEntry,
  settings: PluginSettings | undefined,
): PluginLoad => (settings ? loadedPlugin(plugin, settings) : loading);

const loadedPlugin = (
  { enabled, manifest }: PluginEntry,
  settings: PluginSettings,
): PluginLoad => ({
  status: 'loaded',
  enabled,
  fields: manifest.contributes.settings ?? [],
  settings,
});

function usePluginLoad(pluginId: string): PluginLoad & { name?: string } {
  const { plugins } = usePluginEntries();
  const plugin = plugins?.find((entry) => entry.manifest.id === pluginId);

  const settings = useSettingsQuery(pluginId, plugin !== undefined);

  return {
    ...toPluginLoad(plugins, plugin, settings.data),
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
  };
}

export function PluginSettingsDetailScreen({
  pluginId,
}: PluginSettingsDetailScreenProps): React.JSX.Element {
  const props = usePluginDetail(pluginId);

  return <PluginSettingsDetailView {...props} />;
}
