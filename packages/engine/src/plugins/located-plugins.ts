import type { PluginList, PluginManifest } from '@repo/contracts/plugins';
import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import { discoverPlugins, type PluginsDeps } from './discovery/loader';
import type { PluginLocation } from './runtime/plugin-location';
import type { PluginRuntime } from './runtime/plugin-runtime';
import type { PluginSettings } from './settings/plugin-settings';

type PluginDescriptor = PluginList['plugins'][number];

type LocatedPlugin = { plugin: PluginDescriptor; directory: string };

export type StartedPlugins = { running: string[]; stopped: string[] };

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

export function applyStatus(result: PluginList, runtime: PluginRuntime): void {
  for (const plugin of result.plugins)
    Object.assign(plugin, runtime.status(plugin.manifest.id));
  const error = runtime.error();

  if (error) result.errors.push({ directory: 'plugin-host', message: error });
}

// Each admitted Plugin with its folder and whether it's turned on.
async function locatePlugins(
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

export function requireRuntime(deps: PluginServiceDeps): PluginRuntime {
  if (!deps.pluginRuntime) throw new Error('Plugin runtime is not running');

  return deps.pluginRuntime;
}

function refuseTurnedOff(deps: PluginServiceDeps, pluginId: string): void {
  if (deps.pluginSettings?.enabled(pluginId) === false)
    throw new Error(`Plugin ${pluginId} is turned off`);
}

export function startPlugin(
  deps: PluginServiceDeps,
  { plugin, directory }: LocatedPlugin,
): Promise<PluginStatus> {
  const runtime = requireRuntime(deps);
  const { manifest } = plugin;
  refuseTurnedOff(deps, manifest.id);

  return runtime.activate(locationFor(manifest, directory));
}

function locationFor(
  manifest: PluginManifest,
  directory: string,
): PluginLocation {
  return {
    entry: entryFor(manifest, directory),
    name: manifest.name,
    capabilities: manifest.capabilities ?? [],
    hooks: manifest.contributes.hooks ?? [],
    navIds: manifest.contributes.nav.map(({ id }) => id),
    background: manifest.contributes.background,
  };
}

function entryFor(
  manifest: PluginManifest,
  directory: string,
): PluginLocation['entry'] {
  return {
    pluginId: manifest.id,
    directory,
    main: manifest.main,
    backgroundPath: manifest.contributes.background?.path,
  };
}

// Starts each located Plugin that `declares` picks, in load order; one that fails to start is reported as stopped.
export async function startPlugins(
  deps: PluginServiceDeps,
  declares: (located: LocatedPlugin) => boolean,
): Promise<StartedPlugins> {
  const declaring = (await locatePlugins(deps)).filter(declares);

  const isRunning = await Promise.all(
    declaring.map((located) => isStarted(deps, located)),
  );

  const pluginIds = declaring.map(({ plugin }) => plugin.manifest.id);

  return {
    running: pluginIds.filter((_, index) => isRunning[index]),
    stopped: pluginIds.filter((_, index) => !isRunning[index]),
  };
}

async function isStarted(
  deps: PluginServiceDeps,
  located: LocatedPlugin,
): Promise<boolean> {
  const status = await startPlugin(deps, located).catch(() => null);

  return status?.state === 'running';
}
