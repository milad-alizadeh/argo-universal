import type { LoaderPageCall } from '@repo/contracts/plugins/page-address';
import type { WireNode } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import type { PluginEvent } from '../protocol/runtime';
import { stopWaiting } from '../stopped-calls';
import { checkedPage } from './checked-tree';

/*
 * How long a Loader may read before its draw fails. A Loader awaits the Plugin's own reads, such as a
 * `gh` call, so it is given as long as an Operation.
 */
const drawLimitMs = 30_000;

type Caller = { pluginId: string; generation: number };

// A drawn tree as checked for any App to draw.
export type Drawn =
  | { ok: true; root: WireNode; pages: number }
  | { ok: false; error: string };

type Answered = Extract<LoaderPageCall, { id: number }>;

type Failed = { ok: false; error: string };

// The worker's answer, or why none came: it stopped, was not running or ran out of time.
type Outcome = Answered | Failed;

type Pending = Caller & { settle: (outcome: Outcome) => void };

// An address, how many pages of its paged list the App shows, and the Connection that asked.
type DrawAt = Omit<Extract<PluginEvent, { type: 'draw' }>, 'type' | 'id'>;

// Where a background pass runs a Loader alone: its Page path and the Project it reads for.
export type LoadAt = { path: string; projectId: string };

export type Loaded = { ok: true } | { ok: false; error: string };

export type DrawTransport = {
  send: (pluginId: string, event: PluginEvent) => void;
  clock: PluginClock;
  log: (line: string) => void;
};

const failed = (error: string): Failed => ({ ok: false, error });

type ChangeListener = (pluginId: string) => void;

const answeredError = (answered: Answered): string =>
  answered.action === 'failed' ? answered.error : 'The page only loaded';

function loadedOf(outcome: Outcome): Loaded {
  if ('ok' in outcome) return outcome;

  return outcome.action === 'failed' ? failed(outcome.error) : { ok: true };
}

/*
 * The runtime side of Loader pages (ADR-0050): each draw, and each background pass's load, is one call to
 * the running worker generation, answered by its id, and each generation tells the Page path patterns it
 * defined as it starts.
 */
export class PluginDraws {
  private readonly running = new Map<string, number>();
  private readonly patterns = new Map<string, Set<string>>();
  private readonly pending = new Map<number, Pending>();
  private readonly changeListeners = new Set<ChangeListener>();
  private next = 0;

  public constructor(private readonly transport: DrawTransport) {}

  // A new worker generation defines its pages again as its code runs.
  public activate(pluginId: string): void {
    this.running.delete(pluginId);
    this.patterns.delete(pluginId);
  }

  public ran(pluginId: string, generation: number): void {
    this.running.set(pluginId, generation);
  }

  public patternsOf(pluginId: string): string[] {
    return [...(this.patterns.get(pluginId) ?? [])];
  }

  public async draw(pluginId: string, address: DrawAt): Promise<Drawn> {
    const outcome = await this.call(pluginId, address);

    if ('ok' in outcome) return outcome;

    if (outcome.action !== 'drawn') return failed(answeredError(outcome));

    const { log } = this.transport;

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

    return loadedOf(await this.call(pluginId, at, limitMs));
  }

  private call(
    pluginId: string,
    address: DrawAt,
    limitMs = drawLimitMs,
  ): Promise<Outcome> {
    const generation = this.running.get(pluginId);

    if (generation === undefined)
      return Promise.resolve(failed(`Plugin ${pluginId} is not running`));

    return this.sent({ pluginId, generation }, address, limitMs);
  }

  private sent(
    caller: Caller,
    address: DrawAt,
    limitMs: number,
  ): Promise<Outcome> {
    const id = this.next++;
    const { promise, resolve } = Promise.withResolvers<Outcome>();
    const cancel = this.deadline(address.path, resolve, limitMs);

    this.pending.set(id, { ...caller, settle: resolve });
    this.transport.send(caller.pluginId, { type: 'draw', id, ...address });

    return promise.finally(() => {
      cancel();
      this.pending.delete(id);
    });
  }

  private deadline(
    path: string,
    settle: Pending['settle'],
    limitMs: number,
  ): () => void {
    return this.transport.clock.schedule(
      () => settle(failed(`${path} did not draw in time`)),
      limitMs,
    );
  }

  // What one of the Plugin's Operations wrote, whoever ran it, changes it as `argo.changed()` does.
  public changedBy(pluginId: string): void {
    if (this.running.has(pluginId)) this.notify(pluginId);
  }

  // Hears each running worker's `argo.changed()` and Operations; the answer unsubscribes.
  public onChanged(listener: ChangeListener): () => void {
    this.changeListeners.add(listener);

    return () => this.changeListeners.delete(listener);
  }

  /*
   * A worker defines its patterns as its code runs, before it reports running; an answer or change
   * from an ended worker is ignored.
   */
  public receive(caller: Caller, call: LoaderPageCall): void {
    if (call.action === 'defined') return this.define(caller, call.pattern);

    if (call.action === 'changed') return this.changed(caller);

    this.settle(caller, call);
  }

  private changed({ pluginId, generation }: Caller): void {
    if (this.running.get(pluginId) === generation) this.notify(pluginId);
  }

  private notify(pluginId: string): void {
    for (const listener of this.changeListeners) listener(pluginId);
  }

  private settle(caller: Caller, call: Answered): void {
    const pending = this.pending.get(call.id);

    if (pending?.generation === caller.generation) pending.settle(call);
  }

  private define({ pluginId }: Caller, pattern: string): void {
    const defined = this.patterns.get(pluginId) ?? new Set<string>();

    defined.add(pattern);
    this.patterns.set(pluginId, defined);
  }

  public release(pluginId: string): void {
    this.running.delete(pluginId);
    this.patterns.delete(pluginId);
    this.stop((pending) => pending.pluginId === pluginId);
  }

  public close(): void {
    this.running.clear();
    this.patterns.clear();
    this.stop(() => true);
  }

  private stop(matches: (pending: Pending) => boolean): void {
    stopWaiting(this.pending.values(), matches);
  }
}
