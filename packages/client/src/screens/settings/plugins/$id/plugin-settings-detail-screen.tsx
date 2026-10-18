import type { PluginSettings } from '@repo/contracts/plugins';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useTRPC } from '#features/connection';
import { useServerPageCaption } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
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

function toPluginLoad(
  plugins: PluginEntry[] | undefined,
  plugin: PluginEntry | undefined,
  settings: PluginSettings | undefined,
): PluginLoad {
  if (!plugins) return { status: 'loading' };

  if (!plugin) return { status: 'missing' };

  return settings ? loadedPlugin(plugin, settings) : { status: 'loading' };
}

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
  const settings = useQuery(
    useTRPC().plugins.settings.queryOptions({ pluginId }),
  );

  return {
    ...toPluginLoad(plugins, plugin, settings.data),
    name: plugin?.manifest.name,
  };
}

function usePluginDetail(pluginId: string): PluginSettingsDetailViewProps {
  const navigate = useNavigate();
  const { name, ...plugin } = usePluginLoad(pluginId);

  return {
    title: name ?? pluginId,
    caption: useServerPageCaption(),
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

  return (
    <>
      <ScreenHeader title={props.title} />
      <PluginSettingsDetailView {...props} />
    </>
  );
}
