import type { PluginDataState } from '@repo/contracts/plugins/argo-calls';
import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { PluginViewId } from '@repo/contracts/plugins/wire';
import { runtimeError } from '../protocol/runtime';
import { queryState, readQuery, type QueryReaders } from './query-answer';
import { QueryHolders, reading } from './query-holders';
import type { QueryIntervals } from './query-intervals';
import { QueryTiming } from './query-timing';
import type {
  QueryOwner,
  QueryRead,
  QueryServices,
  QueryWatch,
} from './query-types';
import { QueryWatchers } from './query-watchers';

// What an entry needs besides the Plugin services: the worker its named reads run in, and where its marks go.
export type EntryServices = QueryServices &
  QueryReaders & {
    marked: (pluginId: string, addresses: PageAddress[]) => void;
  };

export class QueryEntry {
  state: PluginDataState = { stale: false, revision: 0 };
  readonly watchers;
  private readonly timing;
  private readonly holders = new QueryHolders();
  private flight: Promise<void> | undefined;
  private dirty = false;
  private closed = false;

  constructor(
    readonly owner: QueryOwner,
    private readonly services: EntryServices,
    intervals: QueryIntervals,
  ) {
    this.watchers = new QueryWatchers(owner, services, intervals);
    this.timing = new QueryTiming(services.clock, () => {
      void this.refresh();
    });
  }

  watch(request: QueryWatch): PluginDataState {
    this.watchers.add(request);

    if (this.shouldRefresh()) void this.refresh();
    else this.schedule();

    return this.state;
  }

  private shouldRefresh(): boolean {
    return !this.timing.ran || this.timing.overdue;
  }

  /*
   * A Loader's read: the kept answer while it is current, or a read joined or begun. A read joined that
   * began before a write is not current when it lands, so the Loader waits for one more.
   */
  async read({ holder, fresh, draw }: QueryRead): Promise<PluginDataState> {
    this.holders.hold(holder, reading);

    if (fresh) await this.refresh(draw);
    await this.untilCurrent(draw, 2);
    this.holders.hold(holder, this.state.revision);

    return this.state;
  }

  private async untilCurrent(draw: number, tries: number): Promise<void> {
    if (tries === 0 || this.current()) return;
    await this.refresh(draw);

    return this.untilCurrent(draw, tries - 1);
  }

  // Read since the last write, not past its due time, and read without failing.
  private current(): boolean {
    return !this.shouldRefresh() && this.state.error === undefined;
  }

  release(key: string): void {
    if (this.watchers.remove(key)) this.timing.makeDue();
    this.schedule();
  }

  releaseView(viewId: PluginViewId): void {
    for (const key of this.watchers.keysForView(viewId)) this.release(key);
  }

  refresh(draw?: number): Promise<void> {
    return this.flight ?? this.begin(draw);
  }

  private begin(draw: number | undefined): Promise<void> {
    this.timing.started();
    this.publish({ ...this.state, stale: this.state.data !== undefined });
    this.flight = this.execute(draw)
      .catch((cause: unknown) => this.failed(cause))
      .finally(() => this.finished());

    return this.flight;
  }

  private async execute(draw: number | undefined): Promise<void> {
    const reply = await readQuery(this.owner, this.services, draw);
    const before = this.state.data;

    this.publish(queryState(this.state, reply));

    if (changed(before, this.state.data)) this.markHolders();
  }

  // The addresses that drew the answer before this one are marked, so the Apps showing them draw again.
  private markHolders(): void {
    const addresses = this.holders.before(this.state.revision);

    if (addresses.length > 0)
      this.services.marked(this.owner.pluginId, addresses);
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

    if (this.dirty) this.readAgain();
  }

  // The answer that landed was read before a write, so it is due at once: a view watching it reads it again.
  private readAgain(): void {
    this.dirty = false;
    this.timing.makeDue();

    if (this.watchers.active) void this.refresh();
  }

  private schedule(): void {
    this.timing.close();

    if (this.paused()) return;

    this.timing.schedule(this.watchers);
  }

  private paused(): boolean {
    return Boolean(this.flight) || this.closed;
  }

  /*
   * A write makes the entry due: a view watching it reads it again now, a read in flight is read again
   * when it lands, and the next Loader read waits for a fresh answer.
   */
  written(): void {
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
    this.holders.clear();
  }
}

// A first answer changes nothing on screen; after that, a different answer does.
const changed = (
  before: PluginDataState['data'],
  after: PluginDataState['data'],
): boolean =>
  before !== undefined && JSON.stringify(before) !== JSON.stringify(after);
