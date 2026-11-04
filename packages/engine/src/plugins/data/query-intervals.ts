export const mountedQueryFloorMs = 10000;

export const backgroundFloorMs = 300000;

export const backgroundBudgetMs = 60000;

/*
 * The intervals a Plugin asks to be read or drawn again on while something is on screen, clamped to one
 * floor (ADR-0037): a Query's `every`, and a Loader page's (ADR-0050). One line per Plugin and clamped
 * interval, kept beside the Plugin so nothing outlives it.
 */
export class QueryIntervals {
  private readonly logged = new Map<string, Set<string>>();

  constructor(private readonly log: (line: string) => void) {}

  mounted(pluginId: string, every: number | undefined): number | undefined {
    return this.clamped(pluginId, 'Query', every);
  }

  // A Loader page drawn again on a clock while on screen, by the pattern it was defined at.
  page(pluginId: string, pattern: string, every: number | undefined): number | undefined {
    return this.clamped(pluginId, `page ${pattern}`, every);
  }

  private clamped(
    pluginId: string,
    subject: string,
    every: number | undefined,
  ): number | undefined {
    if (every === undefined || every >= mountedQueryFloorMs) return every;

    this.logOnce(pluginId, `${subject} every ${every} ms`);

    return mountedQueryFloorMs;
  }

  private logOnce(pluginId: string, asked: string): void {
    const seen = this.logged.get(pluginId) ?? new Set<string>();

    this.logged.set(pluginId, seen);

    if (seen.has(asked)) return;
    seen.add(asked);
    this.log(`Plugin ${pluginId}: ${asked} clamped to ${mountedQueryFloorMs} ms`);
  }

  release(pluginId: string): void {
    this.logged.delete(pluginId);
  }
}
