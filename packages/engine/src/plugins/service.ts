import type { PluginInstruction } from '@repo/contracts/operations/control';
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
  hooksEvent,
  rendersSlot,
} from '@repo/contracts/plugins/plugin-contributions';
import {
  ReplaceableInput,
  type ReplaceableAnswer,
  type RenderFailureInput,
} from '@repo/contracts/plugins/replaceable';
import type {
  PluginFailure,
  PluginBadge,
  PluginStatus,
} from '@repo/contracts/plugins/runtime';
import {
  type SlotItems,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../rpc';
import { discoverWithAccounts } from './accounts/removed-plugins';
import { runsBackground } from './discovery/plugin-contributions';
import { callerOf } from './hooks/hook-rules';
import {
  applyEnabled,
  applyStatus,
  locatePlugin,
  pluginLocation,
  startPlugins,
  type PluginServiceDeps,
} from './located-plugins';
import { pluginInstructions } from './plugin-instructions';
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

  // Each enabled Plugin's instructions, read from its folder without running its code, in Plugin id order.
  async instructions(): Promise<PluginInstruction[]> {
    return pluginInstructions(this.deps);
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

  slotItems(
    input: SlotItemsInput,
    connection: RpcConnection,
  ): AsyncGenerator<SlotItems> {
    return slotItemsFor(this.deps, input, connection);
  }

  public async render(
    input: ReplaceableInput,
    connection: RpcConnection,
  ): Promise<ReplaceableAnswer> {
    const plugins = await startOrderedPlugins(this.deps, ({ plugin }) =>
      rendersSlot(plugin, input.slotId),
    );

    return renderSlot(this.deps.pluginRuntime, { input, plugins }, connection);
  }

  /*
   * An App's report that it could not draw a replacement, logged once per Plugin and Slot. A paired App is
   * not trusted to name a Plugin: one the Server does not have is refused, so it cannot forge or grow the log.
   */
  public async renderFailed(input: RenderFailureInput): Promise<void> {
    await locatePlugin(this.deps, input.pluginId);
    this.deps.pluginRuntime.drawingFailed(input);
  }

  public failures(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    return this.deps.pluginRuntime.watchFailures(signal);
  }

  public badges(signal: AbortSignal): AsyncGenerator<PluginBadge[]> {
    return this.deps.pluginRuntime.data.badges.watch(signal);
  }
}
