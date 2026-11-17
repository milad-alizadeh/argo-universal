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
  // Whether code outside a draw, such as a Slot's provider, read it, so a list's clock may make it due.
  private readOutside = false;

  constructor(
    readonly owner: QueryOwner,
    private readonly services: EntryServices,
  ) {
    this.timing = new QueryTiming(services.clock);
  }

  /*
   * A Loader's read: the kept answer while it is current, or a read joined or begun. A read joined that
   * began before a write is not current when it lands, so the Loader waits for one more. A page drawn
   * again on a clock reads again once the kept answer is as old as its interval. An address that already
   * has a tree is served what was kept while the read it is due runs behind, and is marked if that read
   * answers differently (ADR-0060); a first draw, a pull and a background pass wait for the read.
   */
  async read(read: QueryRead): Promise<PluginDataState> {
    const kept = this.serving(read);

    if (read.outside) this.readOutside = true;

    this.holders.hold(read.holder, reading);

    if (kept) this.revalidate(read.every);
    else await this.awaited(read);

    this.holders.hold(read.holder, this.state.revision);

    return this.state;
  }

  // Whether the draw is served what was kept: its address already has a tree and no one pulled it fresh.
  private serving({ holder, fresh }: QueryRead): boolean {
    return !fresh && this.holders.has(holder) && this.servable();
  }

  private async awaited({ fresh, draw, every }: QueryRead): Promise<void> {
    if (fresh || this.timing.olderThan(every)) await this.refresh(draw);
    await this.untilCurrent(draw, 2);
  }

  // An answer to serve while a fresh one is read: one the last read did not fail.
  private servable(): boolean {
    return this.state.data !== undefined && this.state.error === undefined;
  }

  // Starts, behind the draw that was served, the read the entry is due or old enough for.
  private revalidate(every: number | undefined): void {
    if (this.timing.overdue || this.timing.olderThan(every))
      void this.refresh();
  }

  private async untilCurrent(
    draw: number | undefined,
    tries: number,
  ): Promise<void> {
    if (tries === 0 || this.current()) return;
    await this.refresh(draw);

    return this.untilCurrent(draw, tries - 1);
  }

  // Read since the last write, not past its due time, and read without failing; a failed one resting counts as read.
  private current(): boolean {
    return (
      this.timing.resting ||
      (!this.timing.overdue && this.state.error === undefined)
    );
  }

  /*
   * A failed Query rests, exponentially longer for each failure in a row, and serves its last good answer with the
   * failure until it is over: a rate-limited read is not made again at once, which would only double the load (#2197).
   */
  private refresh(draw?: number): Promise<void> {
    if (this.flight) return this.flight;

    return this.timing.resting ? Promise.resolve() : this.begin(draw);
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
    this.timing[reply.ok ? 'answered' : 'failed']();

    if (changed(before, this.state.data)) this.markHolders();
  }

  // Announce the changed answer even without page holders, so visible Slots ask again.
  private markHolders(): void {
    const addresses = this.holders.before(this.state.revision);

    this.services.marked(this.owner.pluginId, addresses);
  }

  private failed(cause: unknown): void {
    const error = runtimeError(cause);

    this.timing.failed();
    this.services.log(`Plugin ${this.owner.pluginId}: Query failed: ${error}`);
    this.publish({ ...this.state, error, stale: false });
  }

  private finished(): void {
    this.flight = undefined;
    this.timing.finished();
  }

  // Whether a read is in flight that a write has overtaken, so what it hands on is already stale.
  get overtaken(): boolean {
    return this.flight !== undefined && this.timing.overtaken;
  }

  // An answer another read already holds is kept as this Query's, as if it had just been read.
  seed(value: PluginDataState['data']): void {
    const before = this.state.data;

    this.timing.started();
    this.publish(queryState(this.state, { ok: true, value }));
    this.timing.answered();
    this.timing.finished();

    if (changed(before, this.state.data)) this.markHolders();
  }

  // A write makes the entry due: a read in flight lands still due, and the next Loader read waits for a fresh answer.
  written(): void {
    this.timing.makeDue();
  }

  /*
   * A write has made the entry due; one a page holds is read again now, so the addresses whose answer
   * differs are marked and the rest hear nothing. One nobody holds waits to be read.
   */
  async refreshHeld(): Promise<void> {
    if (this.holders.any) await this.untilCurrent(undefined, 2);
  }

  // The addresses whose draws hold the entry.
  get heldKeys(): IteratorObject<string> {
    return this.holders.keys;
  }

  // A list's clock makes due an entry a Slot read once it is as old as the list's interval.
  dueWhenOlder(ms: number): void {
    if (this.readOutside && this.timing.olderThan(ms)) this.timing.makeDue();
  }

  private publish(state: PluginDataState): void {
    this.state = { ...state, revision: this.state.revision + 1 };
  }

  close(): void {
    this.holders.clear();
  }
}

// First answers also wake Slots that timed out while waiting for this entry.
const changed = (
  before: PluginDataState['data'],
  after: PluginDataState['data'],
): boolean => JSON.stringify(before) !== JSON.stringify(after);
