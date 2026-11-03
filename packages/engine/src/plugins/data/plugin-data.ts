import type {
  PluginDataRequest,
  PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
import type { PluginViewId } from '@repo/contracts/plugins/wire';
import { runtimeError, type PluginReply } from '../protocol/runtime';
import type { OpenView } from '../views/open-view';
import type { PluginViews } from '../views/plugin-views';
import { PluginBadges } from './plugin-badges';
import { QueryEntries, type QueryCaller } from './query-entries';
import { QueryIntervals } from './query-intervals';
import {
  watchKey,
  type QueryRead,
  type QueryServices,
  type QueryWatch,
} from './query-types';
import { projectRegistered, refusedProject } from './registered-project';

export class PluginData {
  readonly badges;
  private readonly entries;
  private readonly intervals;

  constructor(
    private readonly services: QueryServices,
    private readonly views: PluginViews,
  ) {
    this.badges = new PluginBadges(services.log);
    this.intervals = new QueryIntervals(services.log);
    this.entries = new QueryEntries(services, this.intervals);
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
    caller: QueryCaller,
    request: PluginDataRequest,
  ): Promise<PluginReply> {
    if (request.action === 'read') return this.readReply(caller, request);

    const view = this.views.dataView(caller.pluginId, request.viewId);

    if (request.action === 'watch')
      return this.watchReply(caller, view, request);
    await this.update(caller.pluginId, request);

    return { ok: true };
  }

  // A Query may name its Project (ADR-0037); one that is not registered is refused as any refused call is.
  private async watchReply(
    caller: QueryCaller,
    view: OpenView,
    request: QueryWatch,
  ): Promise<PluginReply> {
    if (!(await projectRegistered(this.services.services, request.projectId)))
      return { ok: true, value: refusedProject };

    return { ok: true, value: this.watch(caller, view, request) };
  }

  // A read has no view: it answers from the entry a view of this Plugin and Project would watch (ADR-0037).
  private async readReply(
    caller: QueryCaller,
    request: QueryRead,
  ): Promise<PluginReply> {
    if (!(await projectRegistered(this.services.services, request.projectId)))
      return { ok: true, value: refusedProject };

    const entry = this.entries.entry(caller, request);

    this.entries.bound(caller.pluginId);

    return { ok: true, value: await entry.read(request.every) };
  }

  // The watcher is registered before the map is bounded, so this answer is never the entry dropped.
  private watch(
    caller: QueryCaller,
    view: OpenView,
    request: QueryWatch,
  ): PluginDataState {
    const { query, projectId = view.projectId } = request;
    const entry = this.entries.entry(caller, { query, projectId });
    const state = entry.watch(view, request);

    this.entries.bound(caller.pluginId);

    return state;
  }

  private async update(
    pluginId: string,
    request: Exclude<PluginDataRequest, { action: 'watch' | 'read' }>,
  ): Promise<void> {
    const key = watchKey(request);

    const entry = this.entries
      .of(pluginId)
      .values()
      .find((entry) => entry.owns(key));

    if (!entry) return;

    if (request.action === 'release') entry.release(key);
    else await entry.refresh();
  }

  releaseView(viewId: PluginViewId): void {
    for (const entry of this.entries.all()) entry.releaseView(viewId);
  }

  release(pluginId: string): void {
    this.badges.release(pluginId);
    this.intervals.release(pluginId);
    this.entries.closePlugin(pluginId);
  }

  releaseProject(projectId: string): void {
    this.entries.removeProject(projectId);
  }

  storageWritten(pluginId: string): void {
    for (const entry of this.entries.of(pluginId).values())
      entry.storageWritten();
  }

  opened(pluginId: string): void {
    for (const entry of this.entries.of(pluginId).values()) entry.opened();
  }

  // Whether every Query the view has declared so far holds a value or an error.
  queriesSettled(viewId: PluginViewId): boolean {
    return this.entries
      .all()
      .filter((entry) => entry.hasView(viewId))
      .every((entry) => entry.settled);
  }
}
