import type { PluginList, PluginManifest } from '@repo/contracts/plugins';
import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import type { PluginAccounts } from './accounts/plugin-accounts';
import { discoverPlugins, type PluginsDeps } from './discovery/loader';
import type { PluginLocation } from './runtime/plugin-location';
import type { PluginRuntime } from './runtime/plugin-runtime';
import type { PluginSettings } from './settings/plugin-settings';

type PluginDescriptor = PluginList['plugins'][number];

type LocatedPlugin = { plugin: PluginDescriptor; directory: string };

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

export type PluginServiceDeps = PluginsDeps & {
  pluginAccounts: ServiceAccounts;
  pluginRuntime: PluginRuntime;
  pluginSettings: ServiceSettings;
};

export function applyEnabled(
  result: PluginList,
  settings: ServiceSettings,
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

type Discovered = { result: PluginList; locations: Map<string, string> };

async function discover(deps: PluginsDeps): Promise<Discovered> {
  const locations = new Map<string, string>();

  return { result: await discoverPlugins(deps, locations), locations };
}

function locatedIn({ result, locations }: Discovered): LocatedPlugin[] {
  return result.plugins.flatMap((plugin) => {
    const directory = locations.get(plugin.manifest.id);

    return directory ? [{ plugin, directory }] : [];
  });
}

// Each admitted Plugin with its folder and whether it's turned on.
async function locatePlugins(
  deps: PluginServiceDeps,
): Promise<LocatedPlugin[]> {
  const discovered = await discover(deps);
  applyEnabled(discovered.result, deps.pluginSettings);

  return locatedIn(discovered);
}

function findLocated(
  located: LocatedPlugin[],
  pluginId: string,
): LocatedPlugin {
  const found = located.find(({ plugin }) => plugin.manifest.id === pluginId);

  if (!found) throw new Error(`Unknown Plugin: ${pluginId}`);

  return found;
}

export async function locatePlugin(
  deps: PluginServiceDeps,
  pluginId: string,
): Promise<LocatedPlugin> {
  return findLocated(await locatePlugins(deps), pluginId);
}

// The manifest of a Plugin the loader admits, for reading its settings schema.
export async function pluginManifest(
  deps: PluginsDeps,
  pluginId: string,
): Promise<PluginManifest> {
  return findLocated(locatedIn(await discover(deps)), pluginId).plugin.manifest;
}

function refuseTurnedOff(deps: PluginServiceDeps, pluginId: string): void {
  if (!deps.pluginSettings.enabled(pluginId))
    throw new Error(`Plugin ${pluginId} is turned off`);
}

export function startPlugin(
  deps: PluginServiceDeps,
  { plugin, directory }: LocatedPlugin,
): Promise<PluginStatus> {
  const { manifest } = plugin;
  refuseTurnedOff(deps, manifest.id);

  return deps.pluginRuntime.activate(locationFor(manifest, directory));
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
    accountPaths: manifest.contributes.accounts?.map(({ page }) => page),
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
