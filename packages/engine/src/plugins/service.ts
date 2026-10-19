import type {
  HookEventName,
  PluginList,
  PluginSettings as PluginSettingsOutput,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type { Json, JsonObject } from '@repo/contracts/plugins/hook-protocol';
import {
  ReplaceableInput,
  type ReplaceableMessage,
  type RenderFailureInput,
} from '@repo/contracts/plugins/replaceable';
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
import type { RpcConnection } from '../rpc';
import { discoverPlugins } from './discovery/loader';
import {
  applyEnabled,
  applyStatus,
  locatePlugin,
  locatePlugins,
  requireRuntime,
  requireSettings,
  type LocatedPlugin,
  type PluginServiceDeps,
} from './discovery/located-plugins';
import { startPlugin, startPlugins } from './discovery/plugin-activation';
import {
  fillsSlot,
  hooksEvent,
  rendersSlot,
} from './discovery/plugin-contributions';
import { callerOf } from './hooks/hook-rules';
import { renderSlot } from './views/render-slot';
import { slotViews } from './views/slot-views';

export type { PluginServiceDeps } from './discovery/located-plugins';

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
    return startPlugin(this.deps, await locatePlugin(this.deps, pluginId));
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
      { ...(await startPlugins(this.deps, declaring)), exempt },
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
      ({ plugin }) =>
        hooksEvent(plugin, name) && !exempt.has(plugin.manifest.id),
    );
  }

  async dispatch(
    connection: RpcConnection,
    input: PluginDispatchInput,
  ): Promise<void> {
    await requireRuntime(this.deps).views.dispatch(connection, input);
  }

  async *view(
    { pluginId, path }: { pluginId: string; path: string },
    connection: RpcConnection,
  ): AsyncGenerator<ViewMessage> {
    const status = await this.activate(pluginId);

    if (status.state !== 'running')
      throw new Error(status.error ?? `Plugin ${pluginId} is not running`);

    yield* requireRuntime(this.deps).views.watch(
      pluginId,
      { path },
      connection,
    );
  }

  // Every enabled Plugin that declares the Slot fills it; one that fails to start is left out, and its failure is reported like any other.
  async *slot(
    slot: PluginSlotInput,
    connection: RpcConnection,
  ): AsyncGenerator<SlotMessage> {
    const declaring = (await locatePlugins(this.deps)).filter(({ plugin }) =>
      fillsSlot(plugin, slot),
    );

    const pluginIds = (await startPlugins(this.deps, declaring)).running;

    yield { type: 'contributors', pluginIds };
    yield* slotViews(
      requireRuntime(this.deps).views,
      { pluginIds, slot },
      connection,
    );
  }

  public async *render(
    input: ReplaceableInput,
    connection: RpcConnection,
  ): AsyncGenerator<ReplaceableMessage> {
    const declaring = (await locatePlugins(this.deps)).filter(({ plugin }) =>
      rendersSlot(plugin, input.slotId),
    );

    yield* renderSlot(
      requireRuntime(this.deps),
      { input, plugins: await startPlugins(this.deps, declaring) },
      connection,
    );
  }

  public renderFailed(
    connection: RpcConnection,
    input: RenderFailureInput,
  ): void {
    requireRuntime(this.deps).views.renderFailed(connection, input);
  }

  public failures(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    return requireRuntime(this.deps).watchFailures(signal);
  }
}
