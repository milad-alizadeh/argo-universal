import type { LoaderPageCall } from '@repo/contracts/plugins/page-address';
import type { WireNode } from '@repo/contracts/plugins/wire';
import type { PluginEvent } from '../protocol/runtime';
import type {
  Caller,
  CallOutcome,
  Ended,
  KindCalls,
  WorkerCalls,
} from '../runtime/worker-calls';
import { checkedPage } from './checked-tree';

/*
 * How long a Loader may read before its draw fails. A Loader awaits the Plugin's own reads, such as a
 * `gh` call, so it is given as long as an Operation.
 */
const drawLimitMs = 30_000;

// A drawn tree as checked for any App to draw.
export type Drawn =
  | { ok: true; root: WireNode; pages: number }
  | { ok: false; error: string };

type Answered = Extract<LoaderPageCall, { id: number }>;

type Failed = { ok: false; error: string };

// The worker's answer, or why none came: it stopped, was not running or ran out of time.
type Outcome = Answered | Failed;

// An address, how many pages of its paged list the App shows, and the Connection that asked.
type DrawAt = Omit<Extract<PluginEvent, { type: 'draw' }>, 'type' | 'id'>;

// Where a background pass runs a Loader alone: its Page path and the Project it reads for.
export type LoadAt = { path: string; projectId: string };

export type Loaded = { ok: true } | { ok: false; error: string };

type ChangeListener = (pluginId: string) => void;

// The patterns one worker generation defined as its code ran.
type Defined = { generation: number; patterns: Set<string> };

const failed = (error: string): Failed => ({ ok: false, error });

const answeredError = (answered: Answered): string =>
  answered.action === 'failed' ? answered.error : 'The page only loaded';

function loadedOf(outcome: Outcome): Loaded {
  if ('ok' in outcome) return outcome;

  return outcome.action === 'failed' ? failed(outcome.error) : { ok: true };
}

const endedError: Record<Ended, (pluginId: string, path: string) => string> = {
  notRunning: (pluginId: string): string => `Plugin ${pluginId} is not running`,
  stopped: (): string => 'Plugin stopped',
  late: (_pluginId: string, path: string): string =>
    `${path} did not draw in time`,
};

function outcomeOf(outcome: CallOutcome<Answered>, at: DrawAt): Outcome {
  if ('answered' in outcome) return outcome.answered;

  return failed(endedError[outcome.ended](outcome.pluginId, at.path));
}

/*
 * The runtime side of Loader pages (ADR-0050): each draw, and each background pass's load, is one call to
 * the running worker generation, answered by its id, and each generation tells the Page path patterns it
 * defined as it starts.
 */
export class PluginDraws {
  private readonly defined = new Map<string, Defined>();
  private readonly changeListeners = new Set<ChangeListener>();
  private readonly calls: KindCalls<DrawAt, Answered, Outcome>;

  public constructor(
    private readonly workers: WorkerCalls,
    private readonly log: (line: string) => void,
  ) {
    this.calls = workers.kind({
      event: (id, at) => ({ type: 'draw', id, ...at }),
      limitMs: drawLimitMs,
      result: outcomeOf,
    });
    workers.watch((pluginId) => this.forgetEnded(pluginId));
  }

  // Only the running generation's patterns count; a new one defines its pages again as its code runs.
  public patternsOf(pluginId: string): string[] {
    const defined = this.defined.get(pluginId);

    const running = this.workers.generation(pluginId);

    return defined && defined.generation === running
      ? [...defined.patterns]
      : [];
  }

  public async draw(pluginId: string, address: DrawAt): Promise<Drawn> {
    const outcome = await this.calls.call(pluginId, address);

    if ('ok' in outcome) return outcome;

    if (outcome.action !== 'drawn') return failed(answeredError(outcome));

    const { log } = this;

    return checkedPage({ pluginId, path: address.path, log }, outcome);
  }

  // A background pass: the Loader alone, for one Project, given the pass's own budget rather than a draw's.
  public async load(
    pluginId: string,
    { path, projectId }: LoadAt,
    limitMs: number,
  ): Promise<Loaded> {
    const at = {
      path,
      projectId,
      pageState: {},
      pages: 1,
      serverDevice: false,
      loadOnly: true as const,
    };

    return loadedOf(await this.calls.call(pluginId, at, limitMs));
  }

  // What one of the Plugin's Operations wrote, whoever ran it, changes it as `argo.changed()` does.
  public changedBy(pluginId: string): void {
    if (this.workers.generation(pluginId) !== undefined) this.notify(pluginId);
  }

  // Hears each running worker's `argo.changed()` and Operations; the answer unsubscribes.
  public onChanged(listener: ChangeListener): () => void {
    this.changeListeners.add(listener);

    return () => this.changeListeners.delete(listener);
  }

  /*
   * A worker defines its patterns as its code runs, before it reports running; a change from an ended
   * worker is ignored.
   */
  public receive(caller: Caller, call: LoaderPageCall): void {
    if (call.action === 'defined') return this.define(caller, call.pattern);

    if (call.action === 'changed') return this.changed(caller);

    this.calls.answer(caller, call);
  }

  private changed(caller: Caller): void {
    if (this.workers.current(caller)) this.notify(caller.pluginId);
  }

  private notify(pluginId: string): void {
    for (const listener of this.changeListeners) listener(pluginId);
  }

  private define({ pluginId, generation }: Caller, pattern: string): void {
    const kept = this.defined.get(pluginId);

    const defined =
      kept?.generation === generation
        ? kept
        : { generation, patterns: new Set<string>() };

    defined.patterns.add(pattern);
    this.defined.set(pluginId, defined);
  }

  private forgetEnded(pluginId: string): void {
    const running = this.workers.generation(pluginId);

    if (this.defined.get(pluginId)?.generation !== running)
      this.defined.delete(pluginId);
  }
}
