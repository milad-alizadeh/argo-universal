import type { PluginList, PluginSettingValue } from '@repo/contracts/plugins';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { pluginSymbol } from '../../plugins/plugin-symbol';
import type { PluginRow, PluginsLoad } from './plugin-list-view';

export type PluginEntry = PluginList['plugins'][number];

export interface PluginEntries {
  // Undefined until the Server has answered once.
  plugins: PluginEntry[] | undefined;
  isError: boolean;
}

// The connected Server's Plugins.
export function usePluginEntries(): PluginEntries {
  const { data, isError } = useQuery(useTRPC().plugins.list.queryOptions());

  return { plugins: data?.plugins, isError };
}

const toPluginRow = ({ manifest }: PluginEntry): PluginRow => ({
  pluginId: manifest.id,
  name: manifest.name,
  icon: pluginSymbol(manifest.icon),
});

export function usePluginsLoad(): PluginsLoad {
  const { plugins, isError } = usePluginEntries();

  if (plugins) return { status: 'loaded', plugins: plugins.map(toPluginRow) };

  return isError ? { status: 'error' } : { status: 'loading' };
}

// Refetches the Plugin list, each Plugin's settings and the declared Slots' items, after the Server changes them.
export function usePluginsInvalidation(): () => Promise<void> {
  const trpc = useTRPC(),
    cache = useQueryClient();

  return async () => {
    await Promise.all([
      cache.invalidateQueries(trpc.plugins.list.queryFilter()),
      cache.invalidateQueries(trpc.plugins.settings.queryFilter()),
      cache.invalidateQueries(trpc.plugins.declared.queryFilter()),
    ]);
  };
}

// Turns a Plugin on or off on the Server; a failure shows one toast.
export function usePluginEnabledChange(
  pluginId: string,
): (enabled: boolean) => void {
  const onSuccess = usePluginsInvalidation();

  const change = useMutation(
    useTRPC().plugins.setEnabled.mutationOptions({ onSuccess }),
  );

  useErrorToast(
    errorToast('Could not turn the Plugin on or off', change.error),
  );

  return (enabled) => change.mutate({ pluginId, enabled });
}

// Saves one setting on the Server; a failure shows one toast.
export function usePluginSettingChange(
  pluginId: string,
): (key: string, value: PluginSettingValue) => void {
  const onSuccess = usePluginsInvalidation();

  const change = useMutation(
    useTRPC().plugins.setSetting.mutationOptions({ onSuccess }),
  );

  useErrorToast(errorToast('Could not save the setting', change.error));

  return (key, value) => change.mutate({ pluginId, key, value });
}
