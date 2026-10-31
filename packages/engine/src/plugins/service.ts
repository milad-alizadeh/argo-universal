import type {
  HookEventName,
  PluginList,
  PluginSettings as PluginSettingsOutput,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import {
  type DeclaredItems,
  type DeclaredItemsInput,
} from '@repo/contracts/plugins/declared-slots';
import type { Json, JsonObject } from '@repo/contracts/plugins/hook-protocol';
import {
  ReplaceableInput,
  type ReplaceableMessage,
  type RenderFailureInput,
} from '@repo/contracts/plugins/replaceable';
import type {
  PluginFailure,
  PluginBadge,
  PluginStatus,
} from '@repo/contracts/plugins/runtime';
import {
  type PluginDispatchInput,
  type PluginViewInput,
  type SlotItems,
  type SlotItemsInput,
  type ViewMessage,
} from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../rpc';
import { discoverWithAccounts } from './accounts/removed-plugins';
import {
  hooksEvent,
  rendersSlot,
  runsBackground,
} from './discovery/plugin-contributions';
import { callerOf } from './hooks/hook-rules';
import {
  applyEnabled,
  applyStatus,
  locatePlugin,
  pluginLocation,
  startPlugins,
  type PluginServiceDeps,
} from './located-plugins';
import { startOrderedPlugins } from './plugin-order';
import { declaredItems } from './slots/declared-items';
import { renderSlot } from './slots/render-slot';
import { slotItemsFor } from './slots/slot-streams';

export type { PluginServiceDeps } from './located-plugins';

export class PluginService {
  constructor(private readonly deps: PluginServiceDeps) {}

  async startBackground(): Promise<void> {
    await Promise.all([this.list(), this.deps.pluginRuntime.refreshProjects()]);
    await startPlugins(this.deps, ({ plugin }) => runsBackground(plugin));
  }

  async list(): Promise<PluginList> {
    const result = await discoverWithAccounts(this.deps);

    applyEnabled(result, this.deps.pluginSettings);
    applyStatus(result, this.deps.pluginRuntime);

    return result;
  }

  async declared(input: DeclaredItemsInput): Promise<DeclaredItems> {
    return declaredItems(await this.list(), input);
  }

  async activate(pluginId: string): Promise<PluginStatus> {
    return this.deps.pluginRuntime.activate(
      await pluginLocation(this.deps, pluginId),
    );
  }

  // Turning a Plugin off stops its worker and releases what it holds; it starts again when next asked for.
  async setEnabled(pluginId: string, enabled: boolean): Promise<void> {
    await locatePlugin(this.deps, pluginId);
    await this.deps.pluginSettings.setEnabled(pluginId, enabled);

    if (!enabled) return this.deps.pluginRuntime.deactivate(pluginId);

    // The toggle is answered once the setting is durable; `list` reports a Plugin that then fails to start.
    void this.startBackground().catch(() => null);
  }

  settings(pluginId: string): Promise<PluginSettingsOutput> {
    return this.deps.pluginSettings.values(pluginId);
  }

  setSetting(change: {
    pluginId: string;
    key: string;
    value: PluginSettingValue;
  }): Promise<void> {
    return this.deps.pluginSettings.change(change);
  }

  // Starts each Plugin that hooks the event, in load order, then runs their Hooks over core (ADR-0027).
  async runHooks(name: HookEventName, event: JsonObject): Promise<Json> {
    const { hooks } = this.deps.pluginRuntime;
    const exempt = hooks.exempt(callerOf(name, event));

    const started = await startPlugins(
      this.deps,
      ({ plugin }) =>
        hooksEvent(plugin, name) && !exempt.has(plugin.manifest.id),
    );

    return hooks.run({ ...started, exempt }, name, event);
  }

  async dispatch(
    connection: RpcConnection,
    input: PluginDispatchInput,
  ): Promise<void> {
    await this.deps.pluginRuntime.views.dispatch(connection, input);
  }

  async *view(
    { pluginId, path, projectId, sessionId }: PluginViewInput,
    connection: RpcConnection,
  ): AsyncGenerator<ViewMessage> {
    const status = await this.activate(pluginId);

    if (status.state !== 'running')
      throw new Error(status.error ?? `Plugin ${pluginId} is not running`);

    yield* this.deps.pluginRuntime.views.watch(
      pluginId,
      { path, projectId, sessionId },
      connection,
    );
  }

  slotItems(
    input: SlotItemsInput,
    connection: RpcConnection,
  ): AsyncGenerator<SlotItems> {
    return slotItemsFor(this.deps, input, connection);
  }

  public async *render(
    input: ReplaceableInput,
    connection: RpcConnection,
  ): AsyncGenerator<ReplaceableMessage> {
    const plugins = await startOrderedPlugins(this.deps, ({ plugin }) =>
      rendersSlot(plugin, input.slotId),
    );

    yield* renderSlot(this.deps.pluginRuntime, { input, plugins }, connection);
  }

  public renderFailed(
    connection: RpcConnection,
    input: RenderFailureInput,
  ): void {
    this.deps.pluginRuntime.views.renderFailed(connection, input);
  }

  public failures(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    return this.deps.pluginRuntime.watchFailures(signal);
  }

  public badges(signal: AbortSignal): AsyncGenerator<PluginBadge[]> {
    return this.deps.pluginRuntime.data.badges.watch(signal);
  }
}
