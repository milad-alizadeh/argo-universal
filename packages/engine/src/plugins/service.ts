import type { HookEventName, PluginList } from '@repo/contracts/plugins';
import type { Json, JsonObject } from '@repo/contracts/plugins/hook-protocol';
import type {
  PluginFailure,
  PluginStatus,
} from '@repo/contracts/plugins/runtime';
import {
  slotPath,
  type PluginDispatchInput,
  type PluginSlotInput,
  type SlotMessage,
  type ViewMessage,
} from '@repo/contracts/plugins/wire';
import { callerOf } from './hooks/hook-rules';
import { discoverPlugins, type PluginsDeps } from './loader';
import type { PluginRuntime } from './runtime';
import { merged } from './streams';

type PluginDescriptor = PluginList['plugins'][number];

type LocatedPlugin = { plugin: PluginDescriptor; directory: string };

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
    return this.start(await locatePlugin(this.deps, pluginId));
  }

  private start({ plugin, directory }: LocatedPlugin): Promise<PluginStatus> {
    const runtime = requireRuntime(this.deps);
    const { manifest } = plugin;

    return runtime.activate({
      entry: { pluginId: manifest.id, directory, main: manifest.main },
      name: manifest.name,
      // Granted at load with no prompt (ADR-0030).
      capabilities: manifest.capabilities ?? [],
      hooks: manifest.contributes.hooks ?? [],
    });
  }

  // Starts each Plugin that hooks the event, in load order, then runs their Hooks over core (ADR-0027).
  async runHooks(name: HookEventName, event: JsonObject): Promise<Json> {
    const { hooks } = requireRuntime(this.deps);
    const exempt = hooks.exempt(callerOf(name, event));

    const declaring = await this.declaring(name, exempt);

    return hooks.run(
      { ...(await this.started(declaring)), exempt },
      name,
      event,
    );
  }

  // One scan finds every Plugin that hooks the event and where it sits.
  private async declaring(
    name: HookEventName,
    exempt: ReadonlySet<string>,
  ): Promise<LocatedPlugin[]> {
    return (await locatePlugins(this.deps)).filter(
      ({ plugin }) => hooks(plugin, name) && !exempt.has(plugin.manifest.id),
    );
  }

  // A Plugin that fails to start is left out of the chain; the runtime has already reported why.
  private async started(
    declaring: readonly LocatedPlugin[],
  ): Promise<{ running: string[]; stopped: string[] }> {
    const isRunning = await Promise.all(
      declaring.map((located) => this.isStarted(located)),
    );

    const pluginIds = declaring.map(({ plugin }) => plugin.manifest.id);

    return {
      running: pluginIds.filter((_, index) => isRunning[index]),
      stopped: pluginIds.filter((_, index) => !isRunning[index]),
    };
  }

  private async isStarted(located: LocatedPlugin): Promise<boolean> {
    const status = await this.start(located).catch(() => null);

    return status?.state === 'running';
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

    yield* requireRuntime(this.deps).views.watch(pluginId, { path }, signal);
  }

  // Every enabled Plugin that declares the Slot fills it; one that fails to start is left out, and its failure is reported like any other.
  async *slot(
    slot: PluginSlotInput,
    signal: AbortSignal,
  ): AsyncGenerator<SlotMessage> {
    const declaring = (await locatePlugins(this.deps)).filter(({ plugin }) =>
      fills(plugin, slot),
    );

    const pluginIds = (await this.started(declaring)).running;

    yield { type: 'contributors', pluginIds };
    yield* merged(
      pluginIds.map((pluginId) => this.contribution(pluginId, slot, signal)),
    );
  }

  private async *contribution(
    pluginId: string,
    slot: PluginSlotInput,
    signal: AbortSignal,
  ): AsyncGenerator<SlotMessage> {
    const path = slotPath(slot);
    const views = requireRuntime(this.deps).views;

    for await (const message of views.watch(pluginId, { path, slot }, signal))
      yield { type: 'view', pluginId, path, message };
  }

  public failures(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    return requireRuntime(this.deps).watchFailures(signal);
  }
}

const fills = (plugin: PluginDescriptor, slot: PluginSlotInput): boolean =>
  plugin.enabled &&
  (plugin.manifest.contributes.slots ?? []).includes(slot.slotId);

const hooks = (plugin: PluginDescriptor, name: HookEventName): boolean =>
  plugin.enabled && (plugin.manifest.contributes.hooks ?? []).includes(name);

function applyStatus(result: PluginList, runtime: PluginRuntime): void {
  for (const plugin of result.plugins)
    Object.assign(plugin, runtime.status(plugin.manifest.id));
  const error = runtime.error();

  if (error) result.errors.push({ directory: 'plugin-host', message: error });
}

async function locatePlugins(deps: PluginsDeps): Promise<LocatedPlugin[]> {
  const locations = new Map<string, string>();
  const { plugins } = await discoverPlugins(deps, locations);

  return plugins.flatMap((plugin) => {
    const directory = locations.get(plugin.manifest.id);

    return directory ? [{ plugin, directory }] : [];
  });
}

async function locatePlugin(
  deps: PluginsDeps,
  pluginId: string,
): Promise<LocatedPlugin> {
  const located = (await locatePlugins(deps)).find(
    ({ plugin }) => plugin.manifest.id === pluginId,
  );

  if (!located) throw new Error(`Unknown Plugin: ${pluginId}`);

  return located;
}

function requireRuntime(deps: PluginServiceDeps): PluginRuntime {
  if (!deps.pluginRuntime) throw new Error('Plugin runtime is not running');

  return deps.pluginRuntime;
}
