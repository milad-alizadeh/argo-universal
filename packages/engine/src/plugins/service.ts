import type {
  PluginList,
  PluginManifest,
  PluginSettings as PluginSettingsOutput,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type {
  PluginFailure,
  PluginStatus,
} from '@repo/contracts/plugins/runtime';
import type {
  PluginDispatchInput,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import { discoverPlugins, type PluginsDeps } from './loader';
import type { PluginSettings } from './plugin-settings';
import type { PluginRuntime } from './runtime';

type PluginDescriptor = PluginList['plugins'][number];

export type PluginServiceDeps = PluginsDeps & {
  pluginRuntime?: PluginRuntime;
  pluginSettings?: PluginSettings;
};

export class PluginService {
  constructor(private readonly deps: PluginServiceDeps) {}

  async list(): Promise<PluginList> {
    const result = await discoverPlugins(this.deps);

    if (this.deps.pluginSettings)
      applyEnabled(result, this.deps.pluginSettings);

    if (this.deps.pluginRuntime) applyStatus(result, this.deps.pluginRuntime);

    return result;
  }

  async activate(pluginId: string): Promise<PluginStatus> {
    const { plugin, directory } = await locatePlugin(this.deps, pluginId);
    const runtime = requireRuntime(this.deps);

    refuseTurnedOff(this.deps, pluginId);

    return runtime.activate({
      entry: { pluginId, directory, main: plugin.manifest.main },
      name: plugin.manifest.name,
      // Granted at load with no prompt (ADR-0030).
      capabilities: plugin.manifest.capabilities ?? [],
    });
  }

  // Turning a Plugin off stops its worker and releases what it holds; it starts again when next asked for.
  async setEnabled(pluginId: string, enabled: boolean): Promise<void> {
    await locatePlugin(this.deps, pluginId);
    await requireSettings(this.deps).setEnabled(pluginId, enabled);

    if (!enabled) await this.deps.pluginRuntime?.deactivate(pluginId);
  }

  settings(pluginId: string): Promise<PluginSettingsOutput> {
    return requireSettings(this.deps).values(pluginId);
  }

  setSetting(change: {
    pluginId: string;
    key: string;
    value: PluginSettingValue;
  }): Promise<void> {
    return requireSettings(this.deps).change(change);
  }

  async dispatch(input: PluginDispatchInput): Promise<void> {
    requireRuntime(this.deps).views.dispatch(input);
  }

  async *view(
    { pluginId, path }: { pluginId: string; path: string },
    signal: AbortSignal,
  ): AsyncGenerator<ViewMessage> {
    const status = await this.activate(pluginId);

    if (status.state !== 'running')
      throw new Error(status.error ?? `Plugin ${pluginId} is not running`);

    yield* requireRuntime(this.deps).views.watch(pluginId, path, signal);
  }

  public failures(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    return requireRuntime(this.deps).watchFailures(signal);
  }
}

function applyEnabled(result: PluginList, settings: PluginSettings): void {
  for (const plugin of result.plugins)
    plugin.enabled = settings.enabled(plugin.manifest.id);
}

function applyStatus(result: PluginList, runtime: PluginRuntime): void {
  for (const plugin of result.plugins)
    Object.assign(plugin, runtime.status(plugin.manifest.id));
  const error = runtime.error();

  if (error) result.errors.push({ directory: 'plugin-host', message: error });
}

async function locatePlugin(
  deps: PluginsDeps,
  pluginId: string,
): Promise<{ plugin: PluginDescriptor; directory: string }> {
  const locations = new Map<string, string>();
  const result = await discoverPlugins(deps, locations);
  const plugin = result.plugins.find((item) => item.manifest.id === pluginId);
  const directory = locations.get(pluginId);

  if (!plugin || !directory) throw new Error(`Unknown Plugin: ${pluginId}`);

  return { plugin, directory };
}

// The manifest of a Plugin the loader admits, for reading its settings schema.
export async function pluginManifest(
  deps: PluginsDeps,
  pluginId: string,
): Promise<PluginManifest> {
  return (await locatePlugin(deps, pluginId)).plugin.manifest;
}

function requireSettings(deps: PluginServiceDeps): PluginSettings {
  if (!deps.pluginSettings)
    throw new Error('Plugin settings are not available');

  return deps.pluginSettings;
}

function requireRuntime(deps: PluginServiceDeps): PluginRuntime {
  if (!deps.pluginRuntime) throw new Error('Plugin runtime is not running');

  return deps.pluginRuntime;
}

function refuseTurnedOff(deps: PluginServiceDeps, pluginId: string): void {
  if (deps.pluginSettings?.enabled(pluginId) === false)
    throw new Error(`Plugin ${pluginId} is turned off`);
}
