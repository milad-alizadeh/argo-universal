export const mountedQueryFloorMs = 10000;

export const backgroundFloorMs = 300000;

export const backgroundBudgetMs = 60000;

// One line per Plugin and clamped interval, kept beside the Plugin so nothing outlives it.
export class QueryIntervals {
  private readonly logged = new Map<string, Set<number>>();

  constructor(private readonly log: (line: string) => void) {}

  mounted(pluginId: string, every: number | undefined): number | undefined {
    if (every === undefined) return every;

    if (every >= mountedQueryFloorMs) return every;
    this.clamped(pluginId, every);

    return mountedQueryFloorMs;
  }

  private clamped(pluginId: string, every: number): void {
    const seen = this.logged.get(pluginId) ?? new Set<number>();

    this.logged.set(pluginId, seen);

    if (seen.has(every)) return;
    seen.add(every);
    this.log(
      `Plugin ${pluginId}: Query every ${every} ms clamped to ${mountedQueryFloorMs} ms`,
    );
  }

  release(pluginId: string): void {
    this.logged.delete(pluginId);
  }
}
