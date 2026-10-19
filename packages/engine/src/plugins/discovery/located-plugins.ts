import type { PluginList, PluginManifest } from '@repo/contracts/plugins';
import type { PluginRuntime } from '../runtime/plugin-runtime';
import type { PluginSettings } from '../settings/plugin-settings';
import { discoverPlugins, type PluginsDeps } from './loader';

export type PluginDescriptor = PluginList['plugins'][number];

export type LocatedPlugin = { plugin: PluginDescriptor; directory: string };

export type PluginServiceDeps = PluginsDeps & {
  pluginRuntime?: PluginRuntime;
  pluginSettings?: PluginSettings;
};

export function applyEnabled(
  result: PluginList,
  settings: PluginSettings,
): void {
  for (const plugin of result.plugins)
    plugin.enabled = settings.enabled(plugin.manifest.id);
}

// Each admitted Plugin with its folder and whether it's turned on.
export async function locatePlugins(
  deps: PluginServiceDeps,
): Promise<LocatedPlugin[]> {
  const locations = new Map<string, string>();
  const result = await discoverPlugins(deps, locations);

  if (deps.pluginSettings) applyEnabled(result, deps.pluginSettings);

  return result.plugins.flatMap((plugin) => {
    const directory = locations.get(plugin.manifest.id);

    return directory ? [{ plugin, directory }] : [];
  });
}

export async function locatePlugin(
  deps: PluginServiceDeps,
  pluginId: string,
): Promise<LocatedPlugin> {
  const located = (await locatePlugins(deps)).find(
    ({ plugin }) => plugin.manifest.id === pluginId,
  );

  if (!located) throw new Error(`Unknown Plugin: ${pluginId}`);

  return located;
}

// The manifest of a Plugin the loader admits, for reading its settings schema.
export async function pluginManifest(
  deps: PluginsDeps,
  pluginId: string,
): Promise<PluginManifest> {
  return (await locatePlugin(deps, pluginId)).plugin.manifest;
}

export function requireSettings(deps: PluginServiceDeps): PluginSettings {
  if (!deps.pluginSettings)
    throw new Error('Plugin settings are not available');

  return deps.pluginSettings;
}

export function refuseTurnedOff(
  deps: PluginServiceDeps,
  pluginId: string,
): void {
  if (deps.pluginSettings?.enabled(pluginId) === false)
    throw new Error(`Plugin ${pluginId} is turned off`);
}

export function applyStatus(result: PluginList, runtime: PluginRuntime): void {
  for (const plugin of result.plugins)
    Object.assign(plugin, runtime.status(plugin.manifest.id));
  const error = runtime.error();

  if (error) result.errors.push({ directory: 'plugin-host', message: error });
}

export function requireRuntime(deps: PluginServiceDeps): PluginRuntime {
  if (!deps.pluginRuntime) throw new Error('Plugin runtime is not running');

  return deps.pluginRuntime;
}
