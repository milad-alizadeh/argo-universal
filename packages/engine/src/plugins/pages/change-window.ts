import type { PluginClock } from '../clock';

// How long a Plugin's changes gather before they are settled once (ADR-0060).
export const changeWindowMs = 200;

type Window = { cancel: () => void; ended: () => void };

/*
 * Coalesces a Plugin's changes: the first `argo.changed()` or act-tier Operation run opens a window, every one
 * inside it is absorbed, and the Plugin is settled once when it ends. Core does this so a Plugin that says
 * `argo.changed()` on every event costs one refresh, not one per event.
 */
export class ChangeWindow {
  private readonly open = new Map<string, Window>();
  // Each window's end, until its settle is over; what a test waits on before it draws as the App would.
  private readonly pending = new Set<Promise<void>>();

  public constructor(
    private readonly clock: PluginClock,
    private readonly settle: (pluginId: string) => Promise<void>,
    private readonly log: (line: string) => void,
  ) {}

  public request(pluginId: string): void {
    if (this.open.has(pluginId)) return;

    const { promise, resolve } = Promise.withResolvers<void>();

    this.track(promise);
    this.open.set(pluginId, {
      cancel: this.clock.schedule(() => this.end(pluginId), changeWindowMs),
      ended: resolve,
    });
  }

  private track(settled: Promise<void>): void {
    this.pending.add(settled);
    void settled.then(() => this.pending.delete(settled));
  }

  private end(pluginId: string): void {
    const window = this.open.get(pluginId);

    this.open.delete(pluginId);

    // A change that lands while this one settles opens the next window.
    this.settle(pluginId)
      .catch((cause: unknown) =>
        this.log(
          `Plugin ${pluginId}: settling its changes failed: ${String(cause)}`,
        ),
      )
      .finally(() => window?.ended());
  }

  // Resolves once no window is open and every settle has ended, including those a settle opened.
  public async settled(): Promise<void> {
    while (this.pending.size > 0) await Promise.all(this.pending);
  }

  public close(): void {
    for (const { cancel, ended } of this.open.values()) {
      cancel();
      ended();
    }

    this.open.clear();
  }
}
