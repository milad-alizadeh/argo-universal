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
 * the Plugin's: nothing runs once the last list closes or while the Plugin is not running. Every open list shares the
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

  // One tick away, and only while the Plugin runs.
  private arm(hold: Hold): void {
    hold.cancel?.();
    hold.cancel = undefined;

    if (!this.refreshing.running(hold.pluginId)) return;

    hold.cancel = this.refreshing.clock.schedule(
      () => this.tick(hold),
      hold.ms,
    );
  }

  private tick(hold: Hold): void {
    hold.cancel = undefined;
    if (!this.refreshing.running(hold.pluginId)) return;

    this.refreshing.due(hold.pluginId);
    this.refreshing.ask(hold.pluginId);
    this.arm(hold);
  }

  // A Plugin that stopped or started: the timer of the generation that ended is let go, and a running one is armed.
  restarted(pluginId: string): void {
    for (const hold of this.holds.values())
      if (hold.pluginId === pluginId) this.arm(hold);
  }

  close(): void {
    for (const hold of this.holds.values()) hold.cancel?.();
    this.holds.clear();
  }
}
