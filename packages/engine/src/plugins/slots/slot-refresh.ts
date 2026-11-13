import type { PluginClock } from '../clock';

// What the clock needs of the runtime: whether a Plugin runs, and how to make what it kept due and ask it again.
export type Refreshing = {
  clock: PluginClock;
  running: (pluginId: string) => boolean;
  // Makes the Plugin's kept Query answers due (ADR-0037).
  due: (pluginId: string) => void;
  // Drops what the Plugin's Slots kept, so every open list asks it again.
  ask: (pluginId: string) => void;
};

type Hold = {
  pluginId: string;
  ms: number;
  count: number;
  cancel?: () => void;
};

const keyOf = (pluginId: string, ms: number): string => `${pluginId}\n${ms}`;

/*
 * The clock of a list that is open (ADR-0052): while at least one App holds a list that wants its Plugins asked
 * again, one timer per Plugin and interval makes the Plugin's Queries due and its Slots ask again. It is Argo's, not
 * the Plugin's: nothing runs once the last list closes, and a Plugin that is not running is not read. Every open list shares the
 * one timer, and the answers it asks for come through the Queries the Pages share.
 */
export class SlotRefresh {
  private readonly holds = new Map<string, Hold>();

  constructor(private readonly refreshing: Refreshing) {}

  // Holds the clock for these Plugins; the returned function lets go of it.
  hold(pluginIds: readonly string[], ms: number): () => void {
    const held = pluginIds.map((pluginId) => this.acquire(pluginId, ms));

    return () => {
      for (const hold of held) this.release(hold);
    };
  }

  private acquire(pluginId: string, ms: number): Hold {
    const key = keyOf(pluginId, ms);
    const hold = this.holds.get(key) ?? { pluginId, ms, count: 0 };

    hold.count += 1;
    this.holds.set(key, hold);

    if (hold.count === 1) this.arm(hold);

    return hold;
  }

  private release(hold: Hold): void {
    hold.count -= 1;

    if (hold.count > 0) return;

    hold.cancel?.();
    hold.cancel = undefined;
    this.holds.delete(keyOf(hold.pluginId, hold.ms));
  }

  // One tick away. A Plugin that is not running still ticks, so a list that stays open notices it start again.
  private arm(hold: Hold): void {
    hold.cancel?.();
    hold.cancel = this.refreshing.clock.schedule(
      () => this.tick(hold),
      hold.ms,
    );
  }

  private tick(hold: Hold): void {
    hold.cancel = undefined;

    // Nothing of a Plugin that is not running is read; the open list only asks again.
    if (this.refreshing.running(hold.pluginId))
      this.refreshing.due(hold.pluginId);
    this.refreshing.ask(hold.pluginId);
    this.arm(hold);
  }

  // A Plugin that stopped or started: the timer is set afresh, so none outlives the generation it was set for.
  restarted(pluginId: string): void {
    for (const hold of this.holds.values())
      if (hold.pluginId === pluginId) this.arm(hold);
  }

  close(): void {
    for (const hold of this.holds.values()) hold.cancel?.();
    this.holds.clear();
  }
}

// What the clock of one runtime's open lists is built from: its clock, the Queries it makes due, and the Slots it asks again.
type RefreshParts = {
  clock: PluginClock;
  data: { written: (pluginId: string) => void };
  items: { changed: (pluginId: string) => void };
};

/*
 * The clock of one runtime's open lists: a Plugin counts as running while it has a worker generation, and a tick makes
 * its Queries due before the Slots ask it again.
 */
export const refreshFor = (
  workers: { generation: (pluginId: string) => number | undefined },
  { clock, data, items }: RefreshParts,
): SlotRefresh =>
  new SlotRefresh({
    clock,
    due: (pluginId): void => data.written(pluginId),
    ask: (pluginId): void => items.changed(pluginId),
    running: (pluginId): boolean => workers.generation(pluginId) !== undefined,
  });
