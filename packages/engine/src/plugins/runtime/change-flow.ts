import type { PageAddress } from '@repo/contracts/plugins/page-address';
import { realClock, type PluginClock } from '../clock';
import type { PluginData } from '../data/plugin-data';
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

  constructor(
    { changeClock = realClock, log }: Services,
    resources: Resources,
  ) {
    const { workers, data } = resources;

    this.window = new ChangeWindow(
      changeClock,
      (pluginId) => this.settle(resources, pluginId),
      log,
    );

    this.changes = new PageChanges(
      workers,
      (pluginId): void => data.written(pluginId),
      (pluginId): void => this.said(resources, pluginId),
    );
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
      this.markRemaining(pluginId, hostReadHeld, marked);
    }
  }

  private markRemaining(
    pluginId: string,
    addresses: PageAddress[],
    marked: ReadonlySet<string>,
  ): void {
    const unmarked = addresses.filter((at) => !marked.has(addressKey(at)));

    if (unmarked.length > 0) this.changes.heldChanged(pluginId, unmarked);
  }

  // Resolves once every window of changes has been settled: its Queries read and its pages marked.
  settled(): Promise<void> {
    return this.window.settled();
  }

  close(): void {
    this.window.close();
  }
}
