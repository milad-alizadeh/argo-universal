import {
  matchPagePath,
  type LoaderPageCall,
} from '@repo/contracts/plugins/page-address';
import type { DrawPacing } from '@repo/contracts/plugins/page-draw';
import { QueryIntervals } from '../data/query-intervals';
import type { Caller, WorkerCalls } from '../runtime/worker-calls';

type Running = Pick<WorkerCalls, 'generation'>;

// The patterns one worker generation defined as its code ran, each with the interval it is drawn again on, as clamped.
type Defined = {
  generation: number;
  patterns: Map<string, number | undefined>;
};

type DefinedCall = Extract<LoaderPageCall, { action: 'defined' }>;

/*
 * The Page path patterns each Plugin's running generation defined (ADR-0050), and the interval each is drawn
 * again on, clamped and logged as a Query's is (ADR-0037). A new generation defines its pages again as its
 * code runs, so only the running one's count.
 */
export class DefinedPatterns {
  private readonly defined = new Map<string, Defined>();
  private readonly intervals: QueryIntervals;

  public constructor(
    private readonly workers: Running,
    log: (line: string) => void,
  ) {
    this.intervals = new QueryIntervals(log);
  }

  public patternsOf(pluginId: string): string[] {
    return [...(this.running(pluginId)?.keys() ?? [])];
  }

  // The interval the first pattern the path matches is drawn again on, as clamped.
  public everyOf(pluginId: string, path: string): number | undefined {
    const matched = this.running(pluginId)
      ?.entries()
      .find(([pattern]) => matchPagePath(pattern, path) !== null);

    return matched?.[1];
  }

  // A draw's pacing: the interval its path's page is drawn again on, and whether its Loader yields.
  public pacingOf(
    pluginId: string,
    drawn: { path: string; live?: true },
  ): DrawPacing {
    const every = this.everyOf(pluginId, drawn.path);

    return {
      ...(every !== undefined && { every }),
      ...(drawn.live && { live: true }),
    };
  }

  // A pattern defined twice keeps its first interval, as a draw matches the first page defined for it.
  public define(
    { pluginId, generation }: Caller,
    { pattern, every }: DefinedCall,
  ): void {
    const { patterns } = this.at(pluginId, generation);

    if (!patterns.has(pattern))
      patterns.set(pattern, this.intervals.page(pluginId, pattern, every));
  }

  // An ended generation's patterns go, unless a newer one already defined its own.
  public forget(pluginId: string): void {
    this.intervals.release(pluginId);

    if (!this.running(pluginId)) this.defined.delete(pluginId);
  }

  private running(
    pluginId: string,
  ): Map<string, number | undefined> | undefined {
    const defined = this.defined.get(pluginId);
    const generation = this.workers.generation(pluginId);

    return defined && defined.generation === generation
      ? defined.patterns
      : undefined;
  }

  private at(pluginId: string, generation: number): Defined {
    const kept = this.defined.get(pluginId);

    if (kept?.generation === generation) return kept;

    const defined = { generation, patterns: new Map() };

    this.defined.set(pluginId, defined);

    return defined;
  }
}
