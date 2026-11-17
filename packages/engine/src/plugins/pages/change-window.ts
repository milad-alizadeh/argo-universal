import type { PluginClock } from '../clock';

// How long a Plugin's changes gather before they are settled once (ADR-0056).
export const changeWindowMs = 200;

/*
 * Coalesces a Plugin's changes: the first `argo.changed()` or act-tier Operation run opens a window, every one
 * inside it is absorbed, and the Plugin is settled once when it ends. Core does this so a Plugin that says
 * `argo.changed()` on every event costs one refresh, not one per event.
 */
export class ChangeWindow {
  private readonly open = new Map<string, () => void>();

  public constructor(
    private readonly clock: PluginClock,
    private readonly settle: (pluginId: string) => Promise<void>,
    private readonly log: (line: string) => void,
  ) {}

  public request(pluginId: string): void {
    if (this.open.has(pluginId)) return;

    this.open.set(
      pluginId,
      this.clock.schedule(() => this.end(pluginId), changeWindowMs),
    );
  }

  private end(pluginId: string): void {
    this.open.delete(pluginId);

    // A change that lands while this one settles opens the next window.
    this.settle(pluginId).catch((cause: unknown) =>
      this.log(
        `Plugin ${pluginId}: settling its changes failed: ${String(cause)}`,
      ),
    );
  }

  public close(): void {
    for (const cancel of this.open.values()) cancel();
    this.open.clear();
  }
}
