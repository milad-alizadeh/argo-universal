export const mountedQueryFloorMs = 10000;

export const backgroundFloorMs = 300000;

export const backgroundBudgetMs = 60000;

export class QueryIntervals {
  private readonly logged = new Set<string>();

  constructor(private readonly log: (line: string) => void) {}

  mounted(pluginId: string, every: number | undefined): number | undefined {
    if (every === undefined) return every;

    if (every >= mountedQueryFloorMs) return every;
    this.clamped(pluginId, every);

    return mountedQueryFloorMs;
  }

  private clamped(pluginId: string, every: number): void {
    const key = JSON.stringify([pluginId, every]);

    if (this.logged.has(key)) return;
    this.logged.add(key);
    this.log(
      `Plugin ${pluginId}: Query every ${every} ms clamped to ${mountedQueryFloorMs} ms`,
    );
  }
}
