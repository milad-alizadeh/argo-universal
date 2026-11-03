import type { PluginDataState } from '@repo/contracts/plugins/argo-calls';
import type { PluginViewId } from '@repo/contracts/plugins/wire';
import { runtimeError } from '../protocol/runtime';
import type { OpenView } from '../views/open-view';
import { queryState, readQuery } from './query-answer';
import type { QueryIntervals } from './query-intervals';
import { QueryTiming } from './query-timing';
import {
  type QueryOwner,
  type QueryServices,
  type QueryWatch,
} from './query-types';
import { QueryWatchers } from './query-watchers';

export class QueryEntry {
  state: PluginDataState = { stale: false, revision: 0 };
  readonly watchers;
  private readonly timing;
  private flight: Promise<void> | undefined;
  private dirty = false;
  private closed = false;

  constructor(
    readonly owner: QueryOwner,
    private readonly services: QueryServices,
    intervals: QueryIntervals,
  ) {
    this.watchers = new QueryWatchers(owner, services, intervals);
    this.timing = new QueryTiming(services.clock, () => {
      void this.refresh();
    });
  }

  watch(view: OpenView, request: QueryWatch): PluginDataState {
    this.watchers.add(view, request);

    if (this.shouldRefresh()) void this.refresh();
    else this.schedule();

    return this.state;
  }

  private shouldRefresh(): boolean {
    return !this.timing.ran || this.timing.overdue;
  }

  release(key: string): void {
    if (this.watchers.remove(key)) this.timing.makeDue();
    this.schedule();
  }

  releaseView(viewId: PluginViewId): void {
    for (const key of this.watchers.keysForView(viewId)) this.release(key);
  }

  refresh(): Promise<void> {
    return this.flight ?? this.begin();
  }

  private begin(): Promise<void> {
    this.timing.started();
    this.publish({ ...this.state, stale: this.state.data !== undefined });
    this.flight = this.execute()
      .catch((cause: unknown) => this.failed(cause))
      .finally(() => this.finished());

    return this.flight;
  }

  private async execute(): Promise<void> {
    const reply = await readQuery(this.owner, this.services);

    this.publish(queryState(this.state, reply));
  }

  private failed(cause: unknown): void {
    const error = runtimeError(cause);

    this.services.log(`Plugin ${this.owner.pluginId}: Query failed: ${error}`);
    this.publish({ ...this.state, error, stale: false });
  }

  private finished(): void {
    this.flight = undefined;
    this.timing.finished(this.watchers);
    this.schedule();

    if (this.needsRerun()) this.rerun();
  }

  private needsRerun(): boolean {
    return this.dirty && this.watchers.active;
  }

  private rerun(): void {
    this.dirty = false;
    void this.refresh();
  }

  private schedule(): void {
    this.timing.close();

    if (this.paused()) return;

    this.timing.schedule(this.watchers);
  }

  private paused(): boolean {
    return Boolean(this.flight) || this.closed;
  }

  storageWritten(): void {
    if (this.owner.query.api !== 'storage') return;
    this.dirty = Boolean(this.flight);
    this.timing.makeDue();

    if (this.watchers.active) void this.refresh();
  }

  owns(key: string): boolean {
    return this.watchers.has(key);
  }

  private publish(state: PluginDataState): void {
    this.state = { ...state, revision: this.state.revision + 1 };
    this.watchers.publish(this.state);
  }

  close(): void {
    this.closed = true;
    this.watchers.close();
    this.timing.close();
  }
}
