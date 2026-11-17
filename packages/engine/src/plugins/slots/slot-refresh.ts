import type { SlotItemsInput } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';

// What one open list shows: its Slot and the contexts it asks for.
export type Shown = Pick<SlotItemsInput, 'slotId' | 'contexts'>;

/*
 * A Query a Slot read is re-read when it is as old as the interval; the clock ticks a little under the interval
 * after the read the last tick caused ended, so an answer a hair younger counts.
 */
export const ageSlack = 0.9;

// What the clock needs of the runtime: whether a Plugin runs, and how to make what it kept due and ask it again.
export type Refreshing = {
  clock: PluginClock;
  /*
   * Asks the lists again for what they show: what the Plugin's Slots kept for those contexts is dropped, and the
   * Query answers a Slot read that are as old as the interval are made due (ADR-0060). Nothing else is.
   */
  ask: (pluginId: string, shown: readonly Shown[], ms: number) => void;
};

// Whether the person left the Plugin on: a Plugin they turned off has no clock.
type Enabled = (pluginId: string) => boolean;

type Hold = {
  pluginId: string;
  ms: number;
  enabled: Enabled;
  lists: Set<Shown>;
  cancel?: () => void;
};

const keyOf = (pluginId: string, ms: number): string => `${pluginId}\n${ms}`;

/*
 * The clock of a list that is open (ADR-0052): while at least one App holds a list that wants its Plugins asked
 * again, one timer per Plugin and interval asks again the contexts those lists show. It is Argo's, not
 * the Plugin's: nothing runs once the last list closes or while the person has the Plugin turned off, and a Plugin that is not running is not read. Every open list shares the
 * one timer, and the answers it asks for come through the Queries the Pages share.
 */
export class SlotRefresh {
  private readonly holds = new Map<string, Hold>();

  constructor(private readonly refreshing: Refreshing) {}

  // Holds the clock for these Plugins, for as long as the list that shows `shows` is open; the returned function lets go of it.
  hold(
    pluginIds: readonly string[],
    clock: Pick<Hold, 'ms' | 'enabled'>,
    shows: Shown,
  ): () => void {
    const shown = { ...shows };
    const held = pluginIds.map((id) => this.acquire(id, clock, shown));

    return () => {
      for (const hold of held) this.release(hold, shown);
    };
  }

  private acquire(
    pluginId: string,
    clock: Pick<Hold, 'ms' | 'enabled'>,
    shown: Shown,
  ): Hold {
    const hold = this.holdOf(pluginId, clock);

    hold.lists.add(shown);

    if (hold.lists.size === 1) this.arm(hold);

    return hold;
  }

  // The one hold of a Plugin and interval, made when the first list wants it.
  private holdOf(pluginId: string, clock: Pick<Hold, 'ms' | 'enabled'>): Hold {
    const key = keyOf(pluginId, clock.ms);

    const hold = this.holds.get(key) ?? {
      pluginId,
      ...clock,
      lists: new Set(),
    };

    this.holds.set(key, hold);

    return hold;
  }

  private release(hold: Hold, shown: Shown): void {
    hold.lists.delete(shown);

    if (hold.lists.size > 0) return;

    hold.cancel?.();
    hold.cancel = undefined;
    this.holds.delete(keyOf(hold.pluginId, hold.ms));
  }

  /*
   * One tick away, unless the person turned the Plugin off: that releases the clock until they turn it on. A Plugin that
   * is on but not running, crashed or stopped, still ticks, so a list that stays open notices it start again.
   */
  private arm(hold: Hold): void {
    hold.cancel?.();
    hold.cancel = undefined;

    if (!hold.enabled(hold.pluginId)) return;

    hold.cancel = this.refreshing.clock.schedule(
      () => this.tick(hold),
      hold.ms,
    );
  }

  private tick(hold: Hold): void {
    hold.cancel = undefined;

    this.refreshing.ask(hold.pluginId, [...hold.lists], hold.ms);
    this.arm(hold);
  }

  // A Plugin that stopped or started, or was turned off or on: the timer is set afresh, so none outlives that.
  restarted(pluginId: string): void {
    for (const hold of this.holds.values())
      if (hold.pluginId === pluginId) this.arm(hold);
  }

  close(): void {
    for (const hold of this.holds.values()) hold.cancel?.();
    this.holds.clear();
  }
}

// What the clock of one runtime's open lists is built from: its clock, the Queries it ages, and the Slots it asks again.
type RefreshParts = {
  clock: PluginClock;
  data: { writes: { dueWhenOlder: (pluginId: string, ms: number) => void } };
  items: { askAgain: (pluginId: string, shown: readonly Shown[]) => void };
};

/*
 * The clock of one runtime's open lists: a tick asks the Slots again for the contexts the lists show, and makes due,
 * of a running Plugin, only the Query answers a Slot read that are as old as the interval.
 */
export const refreshFor = (
  workers: { generation: (pluginId: string) => number | undefined },
  { clock, data, items }: RefreshParts,
): SlotRefresh =>
  new SlotRefresh({
    clock,
    ask: (pluginId, shown, ms): void => {
      // Nothing of a Plugin that is not running is read; the open list only asks again.
      if (workers.generation(pluginId) !== undefined)
        data.writes.dueWhenOlder(pluginId, ms * ageSlack);
      items.askAgain(pluginId, shown);
    },
  });
