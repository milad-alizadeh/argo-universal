import type { PluginList, PluginManifest } from '@repo/contracts/plugins';
import type { PluginAccounts } from './accounts/plugin-accounts';
import { discoverPlugins, type PluginsDeps } from './discovery/loader';
import type { LocatedCache } from './located-cache';
import { locationFor } from './runtime/location-for';
import type { PluginLocation } from './runtime/plugin-location';
import type { PluginRuntime } from './runtime/plugin-runtime';
import type { PluginSettings } from './settings/plugin-settings';

type PluginDescriptor = PluginList['plugins'][number];

export type LocatedPlugin = { plugin: PluginDescriptor; directory: string };

export type StartedPlugins = { running: string[]; stopped: string[] };

// What the service asks of settings and Accounts: the Server gives it the real ones, a Plugin's own tests plain ones.
export type ServiceSettings = Pick<
  PluginSettings,
  'enabled' | 'setEnabled' | 'values' | 'change'
>;

export type ServiceAccounts = Pick<
  PluginAccounts,
  'list' | 'grants' | 'removePlugin'
>;

// Discovery reads from disk each time unless the Server hands it a cache.
export type CachedDeps = PluginsDeps & { located?: LocatedCache };

// What finding a Plugin needs: where Plugins are and whether each is turned on.
export type LocateDeps = CachedDeps & { pluginSettings: ServiceSettings };

export type PluginServiceDeps = LocateDeps & {
  pluginAccounts: ServiceAccounts;
  pluginRuntime: PluginRuntime;
  // True while the Server watches Plugin sources, so every Plugin it lists is a dev Plugin (ADR-0057).
  dev?: boolean;
};

export function applyEnabled(
  result: PluginList,
  settings: ServiceSettings,
): void {
  for (const plugin of result.plugins)
    plugin.enabled = settings.enabled(plugin.manifest.id);
}

// A dev Server lists its Plugins as dev; any other leaves the mark off, as a Plugin never says it.
export function applyDev(result: PluginList, dev: boolean | undefined): void {
  if (dev !== true) return;

  for (const plugin of result.plugins) plugin.dev = true;
}

export function applyStatus(result: PluginList, runtime: PluginRuntime): void {
  for (const plugin of result.plugins)
    Object.assign(plugin, runtime.status(plugin.manifest.id));
  const error = runtime.error();

  if (error) result.errors.push({ directory: 'plugin-host', message: error });
}

type Discovered = { result: PluginList; locations: Map<string, string> };

async function discover(deps: CachedDeps): Promise<Discovered> {
  if (deps.located) return deps.located.read(deps);
  const locations = new Map<string, string>();

  return { result: await discoverPlugins(deps, locations), locations };
}

// Copies each descriptor, so what the cache holds is never marked with one caller's settings.
function locatedIn({ result, locations }: Discovered): LocatedPlugin[] {
  return result.plugins.flatMap((plugin) => {
    const directory = locations.get(plugin.manifest.id);

    return directory ? [{ plugin: { ...plugin }, directory }] : [];
  });
}

// Each admitted Plugin with its folder and whether it's turned on.
export async function locatePlugins(
  deps: LocateDeps,
): Promise<LocatedPlugin[]> {
  const located = locatedIn(await discover(deps));

  for (const { plugin } of located)
    plugin.enabled = deps.pluginSettings.enabled(plugin.manifest.id);

  return located;
}

function findLocated(
  located: LocatedPlugin[],
  pluginId: string,
): LocatedPlugin {
  const found = located.find(({ plugin }) => plugin.manifest.id === pluginId);

  if (!found) throw new Error(`Unknown Plugin: ${pluginId}`);

  return found;
}

// A Plugin the cache has not seen may have just been added to a folder, so it reads disk once more before giving up.
export async function locatePlugin(
  deps: LocateDeps,
  pluginId: string,
): Promise<LocatedPlugin> {
  const located = await locatePlugins(deps);
  const found = located.find(({ plugin }) => plugin.manifest.id === pluginId);

  if (found || !deps.located) return findLocated(located, pluginId);
  deps.located.clear();

  return findLocated(await locatePlugins(deps), pluginId);
}

// Where the runtime loads a Plugin from; a turned-off Plugin has none.
export async function pluginLocation(
  deps: LocateDeps,
  pluginId: string,
): Promise<PluginLocation> {
  return launchable(deps, await locatePlugin(deps, pluginId));
}

// The manifest of a Plugin the loader admits, for reading its settings schema.
export async function pluginManifest(
  deps: CachedDeps,
  pluginId: string,
): Promise<PluginManifest> {
  return findLocated(locatedIn(await discover(deps)), pluginId).plugin.manifest;
}

// A turned-off Plugin does not load.
function launchable(
  deps: LocateDeps,
  { plugin: { manifest }, directory }: LocatedPlugin,
): PluginLocation {
  if (!deps.pluginSettings.enabled(manifest.id))
    throw new Error(`Plugin ${manifest.id} is turned off`);

  return locationFor(manifest, directory);
}

// Starts each located Plugin that `declares` picks, in load order; one that fails to start is reported as stopped.
export async function startPlugins(
  deps: PluginServiceDeps,
  declares: (located: LocatedPlugin) => boolean,
): Promise<StartedPlugins> {
  return startLocated(deps, (await locatePlugins(deps)).filter(declares));
}

// Starts the located Plugins that `declares` picks, whatever their folders, in `order` (ADR-0035).
export async function startSortedPlugins(
  deps: PluginServiceDeps,
  declares: (located: LocatedPlugin) => boolean,
  order: (a: LocatedPlugin, b: LocatedPlugin) => number,
): Promise<StartedPlugins> {
  const declaring = (await locatePlugins(deps)).filter(declares);

  return startLocated(deps, declaring.toSorted(order));
}

async function startLocated(
  deps: PluginServiceDeps,
  declaring: LocatedPlugin[],
): Promise<StartedPlugins> {
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
  try {
    const location = launchable(deps, located);

    return (await deps.pluginRuntime.activate(location)).state === 'running';
  } catch {
    return false;
  }
}
