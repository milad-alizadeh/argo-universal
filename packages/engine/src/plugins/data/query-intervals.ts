export const pageFloorMs = 10000;

export const backgroundFloorMs = 300000;

export const backgroundBudgetMs = 60000;

/*
 * The interval a Loader page asks to be drawn again on while it is on screen, clamped to a floor as
 * ADR-0037 clamps a Query's (ADR-0050). One line per Plugin and clamped interval, kept beside the Plugin
 * so nothing outlives it.
 */
export class QueryIntervals {
  private readonly logged = new Map<string, Set<string>>();

  constructor(private readonly log: (line: string) => void) {}

  // A Loader page drawn again on a clock while on screen, by the pattern it was defined at.
  page(
    pluginId: string,
    pattern: string,
    every: number | undefined,
  ): number | undefined {
    return this.clamped(pluginId, `page ${pattern}`, every);
  }

  private clamped(
    pluginId: string,
    subject: string,
    every: number | undefined,
  ): number | undefined {
    if (every === undefined || every >= pageFloorMs) return every;

    this.logOnce(pluginId, `${subject} every ${every} ms`);

    return pageFloorMs;
  }

  private logOnce(pluginId: string, asked: string): void {
    const seen = this.logged.get(pluginId) ?? new Set<string>();

    this.logged.set(pluginId, seen);

    if (seen.has(asked)) return;
    seen.add(asked);
    this.log(`Plugin ${pluginId}: ${asked} clamped to ${pageFloorMs} ms`);
  }

  release(pluginId: string): void {
    this.logged.delete(pluginId);
  }
}
