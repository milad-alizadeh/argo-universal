import type { PageAddress } from '@repo/contracts/plugins/page-address';
import { realClock, type PluginClock } from '../clock';
import type { PluginData } from '../data/plugin-data';
import type { PluginOperations } from '../operations';
import type { PluginDraws } from '../pages';
import { PageChanges } from '../pages';
import { ChangeWindow } from '../pages/change-window';
import { addressKey } from '../pages/drawn-reads';
import type { PluginSlotItems } from '../slots/plugin-slot-items';
import type { WorkerCalls } from './worker-calls';

// What a Plugin's changes reach: its running workers, kept Queries and items Slots.
type Resources = {
  workers: WorkerCalls;
  data: PluginData;
  items: PluginSlotItems;
  draws: PluginDraws;
  operations: Pick<PluginOperations, 'writing'>;
};

/*
 * The services that time and log the changes. The window is Argo's own rate limit, not Plugin time, so it runs on
 * the real clock unless a test turns its own; a Plugin's test clock never stalls a change.
 */
type Services = { changeClock?: PluginClock; log: (line: string) => void };

/*
 * How a Plugin's changes reach its pages (ADR-0060): `argo.changed()` and act-tier Operation runs are coalesced
 * per Plugin, then each window refreshes the Queries pages hold, marks the addresses whose answer differs, and those
 * whose draw read the host beside a Query, and wakes the open lists once. A change makes the Plugin's answers due,
 * and drops what its Slots kept, at once; only the reading and the marks wait for the window. A new worker, which
 * makes everything the App kept older code's, marks every page at once.
 */
export class ChangeFlow {
  readonly changes: PageChanges;
  private readonly window: ChangeWindow;
  private readonly writing: (pluginId: string) => boolean;
  // The addresses a changed answer named while the Plugin had a writing run in flight, by Plugin and address key.
  private readonly heldBack = new Map<string, Map<string, PageAddress>>();

  constructor(
    { changeClock = realClock, log }: Services,
    resources: Resources,
  ) {
    const { workers, data, operations } = resources;

    this.writing = (pluginId): boolean => operations.writing(pluginId);
    this.window = new ChangeWindow({
      clock: changeClock,
      settle: (pluginId): Promise<void> => this.settle(resources, pluginId),
      log,
      writing: this.writing,
    });

    this.changes = new PageChanges(
      workers,
      (pluginId): void => data.written(pluginId),
      (pluginId): void => this.said(resources, pluginId),
    );
  }

  /*
   * A Query answer changed for these addresses. While one of the Plugin's writing runs is in flight the answer was
   * read before that write lands, so the mark is held back for the settle after the run, which marks it then; drawn
   * now, it would replace the run's optimistic props with the state before the write (ADR-0060).
   */
  answerChanged(pluginId: string, addresses: PageAddress[]): void {
    if (addresses.length === 0) return;

    if (!this.writing(pluginId)) {
      this.changes.heldChanged(pluginId, addresses);

      return;
    }

    const held = this.heldBack.get(pluginId) ?? new Map<string, PageAddress>();

    for (const at of addresses) held.set(addressKey(at), at);
    this.heldBack.set(pluginId, held);
  }

  // A Plugin's own change: its answers are due at once, what core cannot compare is marked, and the rest waits for the window.
  private said(resources: Resources, pluginId: string): void {
    resources.data.written(pluginId);
    resources.items.drop(pluginId);
    this.markUnheld(resources, pluginId);
    this.window.request(pluginId);
  }

  /*
   * The pages whose draws read nothing core compares are marked with each change, as every page was before: all it
   * can know of them is that a change was said. A Plugin whose draws it has not seen since the Server started marks
   * every page, as the Apps may show pages it never drew (ADR-0060).
   */
  private markUnheld(
    { data, draws }: Pick<Resources, 'data' | 'draws'>,
    pluginId: string,
  ): void {
    if (!draws.reads.knows(pluginId)) return this.changes.allChanged(pluginId);

    const held = data.writes.heldKeys(pluginId);
    const addresses = draws.reads.unheld(pluginId, held);

    if (addresses.length > 0) this.changes.heldChanged(pluginId, addresses);
  }

  /*
   * One window of a Plugin's changes: its held Queries are read again and its open lists wake. A page whose draw read
   * the host beside a Query is marked only once that Query has been read again, so its redraw shows the change, not
   * the answer the change made due; one its Query already marked is not marked twice.
   */
  private async settle(
    { data, items, draws }: Pick<Resources, 'data' | 'items' | 'draws'>,
    pluginId: string,
  ): Promise<void> {
    const hostReadHeld = draws.reads.heldWithHostRead(
      pluginId,
      data.writes.heldKeys(pluginId),
    );

    const marked = new Set<string>();

    const unlisten = this.changes.listen((id, addresses = []) => {
      if (id !== pluginId) return;

      for (const at of addresses) marked.add(addressKey(at));
    });

    try {
      const refreshed = data.writes.changed(pluginId);

      items.wake();
      await refreshed;
    } finally {
      unlisten();
      // A refresh that failed still marks them, as they were marked before.
      this.markRemaining(
        pluginId,
        [...hostReadHeld, ...this.takeHeldBack(pluginId)],
        marked,
      );
    }
  }

  private takeHeldBack(pluginId: string): PageAddress[] {
    const held = this.heldBack.get(pluginId);

    this.heldBack.delete(pluginId);

    return held ? [...held.values()] : [];
  }

  private markRemaining(
    pluginId: string,
    addresses: PageAddress[],
    marked: ReadonlySet<string>,
  ): void {
    const remaining = new Map(
      addresses.flatMap((at) =>
        marked.has(addressKey(at)) ? [] : [[addressKey(at), at] as const],
      ),
    );

    this.answerChanged(pluginId, [...remaining.values()]);
  }

  // Resolves once every window of changes has been settled: its Queries read and its pages marked.
  settled(): Promise<void> {
    return this.window.settled();
  }

  close(): void {
    this.window.close();
  }
}
