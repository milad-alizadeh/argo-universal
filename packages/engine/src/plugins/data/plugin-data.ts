import { createHash } from 'node:crypto';
import {
  serialisePluginQuery,
  type PluginQuery,
  type PluginDataRequest,
  type PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
import type { PluginViewId } from '@repo/contracts/plugins/wire';
import { runtimeError, type PluginReply } from '../protocol/runtime';
import type { OpenView } from '../views/open-view';
import type { PluginViews } from '../views/plugin-views';
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

  private watch(
    caller: Caller,
    view: OpenView,
    request: QueryWatch,
  ): PluginDataState {
    return this.entry(caller, view, request.query).watch(view, request);
  }

  private entry(
    caller: Caller,
    view: OpenView,
    query: PluginQuery,
  ): QueryEntry {
    const entries = this.entriesOf(caller.pluginId);
    const projectId = projectOf(view);
    const key = queryKey(projectId, query);

    const existing = entries.get(key);

    if (existing) return existing;
    const entry = this.createEntry({ ...caller, projectId, query });
    entries.set(key, entry);

    return entry;
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
      .find((entry) => entry.watchers.has(key));

    if (!entry) return;

    if (request.action === 'release') entry.release(key);
    else await entry.refresh();
  }

  releaseView(viewId: PluginViewId): void {
    for (const entry of this.entries()) entry.releaseView(viewId);
  }

  release(pluginId: string): void {
    this.badges.release(pluginId);

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
    for (const entry of this.entriesOf(pluginId).values())
      entry.suspended = false;
  }

  firstQueries(viewId: PluginViewId): () => boolean {
    const entries = this.entries()
      .filter((entry) => entry.hasView(viewId))
      .toArray();

    return () => entries.every((entry) => entry.settled);
  }

  private entries(): IteratorObject<QueryEntry> {
    return this.plugins.values().flatMap((entries) => entries.values());
  }
}

function projectOf(view: OpenView): string | undefined {
  return view.projectId;
}

function queryKey(projectId: string | undefined, query: PluginQuery): string {
  const hash = createHash('sha256')
    .update(serialisePluginQuery(query))
    .digest('hex');

  return JSON.stringify([projectId ?? null, hash]);
}

function removeProject(
  entries: Map<string, QueryEntry>,
  projectId: string,
): void {
  for (const [key, entry] of entries
    .entries()
    .filter(([, entry]) => entry.owner.projectId === projectId)) {
    entry.close();
    entries.delete(key);
  }
}
