import type {
  HookEventName,
  PluginList,
  PluginSettings as PluginSettingsOutput,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type { Json, JsonObject } from '@repo/contracts/plugins/hook-protocol';
import type { PartVersions } from '@repo/contracts/plugins/kit';
import type {
  PluginFailure,
  PluginStatus,
} from '@repo/contracts/plugins/runtime';
import {
  type PluginDispatchInput,
  type PluginSlotInput,
  type SlotMessage,
  type ViewMessage,
} from '@repo/contracts/plugins/wire';
import { compatibleView } from './compatible-view';
import { contributions } from './contribution';
import { callerOf } from './hooks/hook-rules';
import { discoverPlugins } from './loader';
import {
  applyEnabled,
  applyStatus,
  locatePlugin,
  locatePlugins,
  refuseTurnedOff,
  requireRuntime,
  requireSettings,
  type LocatedPlugin,
  type PluginDescriptor,
  type PluginServiceDeps,
} from './located-plugins';

export type { PluginServiceDeps } from './located-plugins';

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
    return this.start(await locatePlugin(this.deps, pluginId));
  }

  private start({ plugin, directory }: LocatedPlugin): Promise<PluginStatus> {
    const runtime = requireRuntime(this.deps);
    const { manifest } = plugin;

    refuseTurnedOff(this.deps, manifest.id);

    return runtime.activate({
      entry: { pluginId: manifest.id, directory, main: manifest.main },
      name: manifest.name,
      // Granted at load with no prompt (ADR-0030).
      capabilities: manifest.capabilities ?? [],
      hooks: manifest.contributes.hooks ?? [],
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
    parts?: PartVersions,
  ): AsyncGenerator<ViewMessage> {
    const status = await this.activate(pluginId);

    if (status.state !== 'running')
      throw new Error(status.error ?? `Plugin ${pluginId} is not running`);

    yield* compatibleView(
      requireRuntime(this.deps).views.watch(pluginId, { path }, signal),
      parts,
    );
  }

  // Every enabled Plugin that declares the Slot fills it; one that fails to start is left out, and its failure is reported like any other.
  async *slot(
    slot: PluginSlotInput,
    signal: AbortSignal,
    parts?: PartVersions,
  ): AsyncGenerator<SlotMessage> {
    const declaring = (await locatePlugins(this.deps)).filter(({ plugin }) =>
      fills(plugin, slot),
    );

    const pluginIds = (await this.started(declaring)).running;

    yield* contributions(
      requireRuntime(this.deps).views,
      { pluginIds, slot, parts },
      signal,
    );
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
