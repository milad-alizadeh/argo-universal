import type { HookEventName, PluginList } from '@repo/contracts/plugins';
import type { Json, JsonObject } from '@repo/contracts/plugins/hook-protocol';
import type {
  PluginFailure,
  PluginStatus,
} from '@repo/contracts/plugins/runtime';
import type {
  PluginDispatchInput,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import { callerOf } from './hooks/hook-rules';
import { discoverPlugins, type PluginsDeps } from './loader';
import type { PluginRuntime } from './runtime';

type PluginDescriptor = PluginList['plugins'][number];

export type PluginServiceDeps = PluginsDeps & {
  pluginRuntime?: PluginRuntime;
};

export class PluginService {
  constructor(private readonly deps: PluginServiceDeps) {}

  async list(): Promise<PluginList> {
    const result = await discoverPlugins(this.deps);

    if (this.deps.pluginRuntime) applyStatus(result, this.deps.pluginRuntime);

    return result;
  }

  async activate(pluginId: string): Promise<PluginStatus> {
    const { plugin, directory } = await locatePlugin(this.deps, pluginId);
    const runtime = requireRuntime(this.deps);

    return runtime.activate({
      entry: { pluginId, directory, main: plugin.manifest.main },
      name: plugin.manifest.name,
      // Granted at load with no prompt (ADR-0030).
      capabilities: plugin.manifest.capabilities ?? [],
      hooks: plugin.manifest.contributes.hooks ?? [],
    });
  }

  // Starts each Plugin that hooks the event, in load order, then runs their Hooks over core (ADR-0027).
  async runHooks(name: HookEventName, event: JsonObject): Promise<Json> {
    const pluginIds = await this.hooking(name, callerOf(name, event));

    return requireRuntime(this.deps).hooks.run(pluginIds, name, event);
  }

  // A Plugin that fails to start is left out; the runtime has already reported why.
  private async hooking(
    name: HookEventName,
    caller: string | undefined,
  ): Promise<string[]> {
    const { plugins } = await discoverPlugins(this.deps);

    const declaring = plugins
      .filter((plugin) => hooks(plugin, name) && plugin.manifest.id !== caller)
      .map((plugin) => plugin.manifest.id);

    const started = await Promise.all(
      declaring.map((pluginId) => this.activate(pluginId).catch(() => null)),
    );

    return declaring.filter((_, index) => started[index]?.state === 'running');
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

const hooks = (plugin: PluginDescriptor, name: HookEventName): boolean =>
  plugin.enabled && (plugin.manifest.contributes.hooks ?? []).includes(name);

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

function requireRuntime(deps: PluginServiceDeps): PluginRuntime {
  if (!deps.pluginRuntime) throw new Error('Plugin runtime is not running');

  return deps.pluginRuntime;
}
