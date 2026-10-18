import type { PluginList } from '@repo/contracts/plugins';
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
import { discoverPlugins, type PluginsDeps } from './loader';
import type { PluginRuntime } from './runtime';
import { merged } from './streams';

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
    });
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
    const pluginIds = await this.startContributors(slot);

    yield { type: 'contributors', pluginIds };
    yield* merged(
      pluginIds.map((pluginId) => this.contribution(pluginId, slot, signal)),
    );
  }

  // The enabled Plugins that declare the Slot and start, in list order.
  private async startContributors(slot: PluginSlotInput): Promise<string[]> {
    const declared = (await this.list()).plugins
      .filter((plugin) => fills(plugin, slot))
      .map((plugin) => plugin.manifest.id);

    const started = await Promise.all(
      declared.map((pluginId) => this.startContributor(pluginId)),
    );

    return declared.filter((_, index) => started[index]);
  }

  private async startContributor(pluginId: string): Promise<boolean> {
    const status = await this.activate(pluginId).catch(() => null);

    return status?.state === 'running';
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
