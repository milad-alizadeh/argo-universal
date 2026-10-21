import type {
  PluginQuery,
  PluginDataRequest,
  PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
import type { PluginViewId } from '@repo/contracts/plugins/wire';
import { runtimeError, type PluginReply } from '../protocol/runtime';
import type { OpenView } from '../views/open-view';
import type { PluginViews } from '../views/plugin-views';
import {
  dropOldest,
  keepNewest,
  queryKey,
  removeProject,
  retainedWarmEntries,
} from './entry-map';
import { PluginBadges } from './plugin-badges';
import { QueryEntry } from './query-entry';
import { QueryIntervals } from './query-intervals';
import {
  watchKey,
  type QueryOwner,
  type QueryServices,
  type QueryWatch,
} from './query-types';

type Caller = Pick<QueryOwner, 'pluginId' | 'generation'>;

export class PluginData {
  readonly badges;
  private readonly plugins = new Map<string, Map<string, QueryEntry>>();
  private readonly intervals;

  constructor(
    private readonly services: QueryServices,
    private readonly views: PluginViews,
  ) {
    this.badges = new PluginBadges(services.log);
    this.intervals = new QueryIntervals(services.log);
  }

  async handle(
    pluginId: string,
    generation: number,
    request: PluginDataRequest,
  ): Promise<PluginReply> {
    try {
      return await this.operate({ pluginId, generation }, request);
    } catch (cause) {
      return { ok: false, error: runtimeError(cause) };
    }
  }

  private async operate(
    caller: Caller,
    request: PluginDataRequest,
  ): Promise<PluginReply> {
    const view = this.views.dataView(caller.pluginId, request.viewId);

    if (request.action === 'watch')
      return { ok: true, value: this.watch(caller, view, request) };
    await this.update(caller.pluginId, request);

    return { ok: true };
  }

  // The watcher is registered before the map is bounded, so this answer is never the entry dropped.
  private watch(
    caller: Caller,
    view: OpenView,
    request: QueryWatch,
  ): PluginDataState {
    const entries = this.entriesOf(caller.pluginId);
    const state = this.entry(caller, view, request.query).watch(view, request);

    this.bound(caller.pluginId, entries);

    return state;
  }

  private entry(
    caller: Caller,
    view: OpenView,
    query: PluginQuery,
  ): QueryEntry {
    const entries = this.entriesOf(caller.pluginId);
    const { projectId } = view;
    const key = queryKey(projectId, query);

    const existing = entries.get(key);

    if (existing) return keepNewest(entries, key, existing);
    const entry = this.createEntry({ ...caller, projectId, query });

    entries.set(key, entry);

    return entry;
  }

  // The warm path keeps answers no view holds, so only the oldest unwatched ones go.
  private bound(pluginId: string, entries: Map<string, QueryEntry>): void {
    if (entries.size <= retainedWarmEntries) return;
    const dropped = dropOldest(entries);

    if (dropped === 0) return;
    this.services.log(
      `Plugin ${pluginId}: dropped ${dropped} warm Query answers over the ${retainedWarmEntries} kept`,
    );
  }

  private createEntry(owner: QueryOwner): QueryEntry {
    return new QueryEntry(owner, this.services, this.intervals);
  }

  private entriesOf(pluginId: string): Map<string, QueryEntry> {
    const existing = this.plugins.get(pluginId);

    if (existing) return existing;
    const entries = new Map<string, QueryEntry>();
    this.plugins.set(pluginId, entries);

    return entries;
  }

  private async update(
    pluginId: string,
    request: Exclude<PluginDataRequest, { action: 'watch' }>,
  ): Promise<void> {
    const key = watchKey(request);

    const entry = this.entriesOf(pluginId)
      .values()
      .find((entry) => entry.owns(key));

    if (!entry) return;

    if (request.action === 'release') entry.release(key);
    else await entry.refresh();
  }

  releaseView(viewId: PluginViewId): void {
    for (const entry of this.entries()) entry.releaseView(viewId);
  }

  release(pluginId: string): void {
    this.badges.release(pluginId);
    this.intervals.release(pluginId);

    for (const entry of this.entriesOf(pluginId).values()) entry.close();
    this.plugins.delete(pluginId);
  }

  releaseProject(projectId: string): void {
    for (const entries of this.plugins.values())
      removeProject(entries, projectId);
  }

  storageWritten(pluginId: string): void {
    for (const entry of this.entriesOf(pluginId).values())
      entry.storageWritten();
  }

  opened(pluginId: string): void {
    for (const entry of this.entriesOf(pluginId).values()) entry.opened();
  }

  // Whether every Query the view has declared so far holds a value or an error.
  queriesSettled(viewId: PluginViewId): boolean {
    return this.entries()
      .filter((entry) => entry.hasView(viewId))
      .every((entry) => entry.settled);
  }

  private entries(): IteratorObject<QueryEntry> {
    return this.plugins.values().flatMap((entries) => entries.values());
  }
}
