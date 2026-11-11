import type { PluginDataState } from '@repo/contracts/plugins/argo-calls';
import type { PageAddress } from '@repo/contracts/plugins/page-address';
import { runtimeError } from '../protocol/runtime';
import { queryState, readQuery, type QueryReaders } from './query-answer';
import { QueryHolders, reading } from './query-holders';
import { QueryTiming } from './query-timing';
import type { QueryOwner, QueryRead, QueryServices } from './query-types';

// What an entry needs besides the Plugin services: the worker its named reads run in, and where its marks go.
export type EntryServices = QueryServices &
  QueryReaders & {
    marked: (pluginId: string, addresses: PageAddress[]) => void;
  };

export class QueryEntry {
  state: PluginDataState = { stale: false, revision: 0 };
  private readonly timing;
  private readonly holders = new QueryHolders();
  private flight: Promise<void> | undefined;

  constructor(
    readonly owner: QueryOwner,
    private readonly services: EntryServices,
  ) {
    this.timing = new QueryTiming(services.clock);
  }

  /*
   * A Loader's read: the kept answer while it is current, or a read joined or begun. A read joined that
   * began before a write is not current when it lands, so the Loader waits for one more. A page drawn
   * again on a clock reads again once the kept answer is as old as its interval.
   */
  async read({
    holder,
    fresh,
    draw,
    every,
  }: QueryRead): Promise<PluginDataState> {
    this.holders.hold(holder, reading);

    if (fresh || this.timing.olderThan(every)) await this.refresh(draw);
    await this.untilCurrent(draw, 2);
    this.holders.hold(holder, this.state.revision);

    return this.state;
  }

  private async untilCurrent(
    draw: number | undefined,
    tries: number,
  ): Promise<void> {
    if (tries === 0 || this.current()) return;
    await this.refresh(draw);

    return this.untilCurrent(draw, tries - 1);
  }

  // Read since the last write, not past its due time, and read without failing.
  private current(): boolean {
    return !this.timing.overdue && this.state.error === undefined;
  }

  private refresh(draw?: number): Promise<void> {
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
    this.timing.finished();
  }

  // An answer another read already holds is kept as this Query's, as if it had just been read.
  seed(value: PluginDataState['data']): void {
    const before = this.state.data;

    this.timing.started();
    this.publish(queryState(this.state, { ok: true, value }));
    this.timing.finished();

    if (changed(before, this.state.data)) this.markHolders();
  }

  // A write makes the entry due: a read in flight lands still due, and the next Loader read waits for a fresh answer.
  written(): void {
    this.timing.makeDue();
  }

  private publish(state: PluginDataState): void {
    this.state = { ...state, revision: this.state.revision + 1 };
  }

  close(): void {
    this.holders.clear();
  }
}

// A first answer changes nothing on screen; after that, a different answer does.
const changed = (
  before: PluginDataState['data'],
  after: PluginDataState['data'],
): boolean =>
  before !== undefined && JSON.stringify(before) !== JSON.stringify(after);
