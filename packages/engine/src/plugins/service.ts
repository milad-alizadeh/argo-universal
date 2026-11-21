import type { PluginInstruction } from '@repo/contracts/operations/control';
import type { DraftChoice } from '@repo/contracts/operations/plugin-drafts';
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
import { startsWithServer } from './discovery/plugin-contributions';
import { undeclaredCommentPlace, undeclaredPick } from './drafts/draft-picks-check';
import { draftPrompt } from './drafts/draft-prompt';
import type { ChosenDraft, PluginDrafts } from './drafts/plugin-drafts';
import { callerOf } from './hooks/hook-rules';
import { LocatedCache } from './located-cache';
import {
  applyDev,
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

// Hands a Plugin's Draft choice to a Session as that Plugin; answers whether it began a Turn or joined the queue.
export type DeliverDraft = (
  sessionId: string,
  prompt: { pluginId: string; title: string; text: string },
) => Promise<'started' | 'queued'>;

export class PluginService {
  private readonly deps: PluginServiceDeps;

  // Where Plugins are found is read from disk once and kept; a Server shares its cache with the runtime's dev builds.
  constructor(
    deps: PluginServiceDeps,
    private readonly drafts?: PluginDrafts,
  ) {
    this.deps = { ...deps, located: deps.located ?? new LocatedCache() };
  }

  async startBackground(): Promise<void> {
    await Promise.all([this.list(), this.deps.pluginRuntime.refreshProjects()]);
    await startPlugins(this.deps, ({ plugin }) => startsWithServer(plugin));
  }

  async list(): Promise<PluginList> {
    const result = await discoverWithAccounts(this.deps);

    applyEnabled(result, this.deps.pluginSettings);
    applyStatus(result, this.deps.pluginRuntime);
    applyDev(result, this.deps.dev);

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

  // Rebuilds a dev Plugin at once; a build that fails keeps the worker and is the refusal (ADR-0057).
  async showDraft(
    pluginId: string,
    region?: string,
    sessionId?: string,
  ): Promise<void> {
    await this.activate(pluginId);

    // The Session that draws is the one the author's Choose answers to.
    if (sessionId) await this.draftStore().drawnBy(pluginId, sessionId);

    // The mark of the worker this swaps in names the region, so Apps frame it (ADR-0057).
    const done = this.deps.pluginRuntime.changes.drawing(pluginId, region);

    try {
      const error = await this.deps.pluginRuntime.showDraft(pluginId);

      if (error) throw new Error(error);

      // Answered once the new worker reports, so the Agent's next step sees the Draft drawn.
      const status = await this.activate(pluginId);

      if (status.state !== 'running')
        throw new Error(status.error ?? 'Plugin did not start');
    } finally {
      done();
    }
  }

  // Records the author's choice and hands it to the Session whose Agent draws the Draft (ADR-0057).
  async chooseDraft(
    { pluginId, ...chosen }: ChosenDraft & { pluginId: string },
    deliver: DeliverDraft,
  ): Promise<{ sessionId: string; delivery: 'started' | 'queued' }> {
    const { name, contributes } = await locatePlugin(this.deps, pluginId).then(
      ({ plugin }) => plugin.manifest,
    );

    if (this.deps.dev !== true)
      throw new Error(`${pluginId} is not a dev Plugin, so it has no Draft`);

    const refusal =
      undeclaredPick(chosen.picks, contributes.drafts) ??
      undeclaredCommentPlace(chosen.comments, contributes.drafts);

    if (refusal) throw new Error(refusal);

    const sessionId = this.draftStore().sessionOf(pluginId);

    if (!sessionId)
      throw new Error(
        `No Session is drawing ${pluginId}'s Draft: its Agent runs plugin.draft.show from its Session first.`,
      );

    await this.draftStore().choose(pluginId, chosen);

    const delivery = await deliver(sessionId, {
      pluginId,
      title: name,
      text: draftPrompt({ pluginId, title: name }, chosen),
    });

    return { sessionId, delivery };
  }

  // Where Drafts are kept; a service built without a store has no Drafts.
  private draftStore(): PluginDrafts {
    if (!this.drafts) throw new Error('Plugin Drafts are not available');

    return this.drafts;
  }

  draftChoice(pluginId: string): DraftChoice | null {
    return this.draftStore().choice(pluginId);
  }

  // Turning a Plugin off stops its worker and releases what it holds; it starts again when next asked for.
  async setEnabled(pluginId: string, enabled: boolean): Promise<void> {
    await locatePlugin(this.deps, pluginId);
    await this.deps.pluginSettings.setEnabled(pluginId, enabled);
    this.deps.located?.clear();
    // An open list's refresh clock follows the setting: off releases it, on sets it again.
    this.deps.pluginRuntime.items.refresh.restarted(pluginId);

    if (!enabled) return this.deps.pluginRuntime.deactivate(pluginId);

    // The toggle is answered once the setting is durable; `list` reports a Plugin that then fails to start.
    void this.startBackground().catch(() => null);
  }

  settings(pluginId: string): Promise<PluginSettingsOutput> {
    return this.deps.pluginSettings.values(pluginId);
  }

  async setSetting(change: {
    pluginId: string;
    key: string;
    value: PluginSettingValue;
  }): Promise<void> {
    await this.deps.pluginSettings.change(change);
    // A page that draws from a Setting, such as a sign-in waiting for its OAuth app, draws again with the new value.
    this.deps.pluginRuntime.changes.settingChanged(change.pluginId);
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
