import type { PluginClock } from '../clock';
import type { PluginData } from '../data/plugin-data';
import { ChangeWindow } from '../pages/change-window';
import { PageChanges } from '../pages/page-changes';
import type { PluginSlotItems } from '../slots/plugin-slot-items';
import type { WorkerCalls } from './worker-calls';

// What a Plugin's changes reach: its running workers, kept Queries and items Slots.
type Resources = {
  workers: WorkerCalls;
  data: PluginData;
  items: PluginSlotItems;
};

// The services that time and log the changes.
type Services = { clock: PluginClock; log: (line: string) => void };

// What one window of a Plugin's changes comes to: its Queries are read, and its Slots ask again at once.
const settled =
  ({ data, items }: Pick<Resources, 'data' | 'items'>) =>
  async (pluginId: string): Promise<void> => {
    const refreshed = data.writes.changed(pluginId);

    items.changed(pluginId);
    await refreshed;
  };

/*
 * How a Plugin's changes reach its pages (ADR-0056): `argo.changed()` and act-tier Operation runs are coalesced
 * per Plugin, then each window refreshes the Queries pages hold, marks the addresses whose answer differs and
 * asks the Slots again once. A change makes the Plugin's answers due at once; only the reading and the marks wait for the window. A new worker, which makes everything the App kept older code's, marks every page at once.
 */
export class ChangeFlow {
  readonly changes: PageChanges;
  private readonly window: ChangeWindow;

  constructor({ clock, log }: Services, { workers, data, items }: Resources) {
    this.window = new ChangeWindow(clock, settled({ data, items }), log);

    this.changes = new PageChanges(
      workers,
      (pluginId): void => data.written(pluginId),
      (pluginId): void => {
        data.written(pluginId);
        this.window.request(pluginId);
      },
    );
  }

  close(): void {
    this.window.close();
  }
}
