import type {
  LoaderPageCall,
  PageAddress,
} from '@repo/contracts/plugins/page-address';
import type { WireJson } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import type { PluginEvent } from '../protocol/runtime';
import { stopWaiting } from '../stopped-calls';

/*
 * How long a Loader may read before its draw fails. A Loader awaits the Plugin's own reads, such as a
 * `gh` call, so it is given as long as an Operation.
 */
const drawLimitMs = 30_000;

type Caller = { pluginId: string; generation: number };

export type Drawn = { ok: true; root: WireJson } | { ok: false; error: string };

type Pending = Caller & { settle: (drawn: Drawn) => void };

export type DrawTransport = {
  send: (pluginId: string, event: PluginEvent) => void;
  clock: PluginClock;
};

const failed = (error: string): Drawn => ({ ok: false, error });

type Answered = Extract<LoaderPageCall, { id: number }>;

type StaleListener = (pluginId: string) => void;

const drawnOf = (call: Answered): Drawn =>
  call.action === 'drawn' ? { ok: true, root: call.root } : failed(call.error);

/*
 * The runtime side of Loader pages (ADR-0050): each draw is one call to the running worker generation,
 * answered by its id, and each generation tells the Page path patterns it defined as it starts.
 */
export class PluginDraws {
  private readonly running = new Map<string, number>();
  private readonly patterns = new Map<string, Set<string>>();
  private readonly pending = new Map<number, Pending>();
  private readonly staleListeners = new Set<StaleListener>();
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

  public draw(
    pluginId: string,
    address: Omit<PageAddress, 'pluginId'>,
  ): Promise<Drawn> {
    const generation = this.running.get(pluginId);

    if (generation === undefined)
      return Promise.resolve(failed(`Plugin ${pluginId} is not running`));

    return this.call({ pluginId, generation }, address);
  }

  private call(
    caller: Caller,
    address: Omit<PageAddress, 'pluginId'>,
  ): Promise<Drawn> {
    const id = this.next++;
    const { promise, resolve } = Promise.withResolvers<Drawn>();
    const cancel = this.deadline(address.path, resolve);

    this.pending.set(id, { ...caller, settle: resolve });
    this.transport.send(caller.pluginId, { type: 'draw', id, ...address });

    return promise.finally(() => {
      cancel();
      this.pending.delete(id);
    });
  }

  private deadline(path: string, settle: Pending['settle']): () => void {
    return this.transport.clock.schedule(
      () => settle(failed(`${path} did not draw in time`)),
      drawLimitMs,
    );
  }

  // Hears each running worker that marks its Loader pages stale; the answer unsubscribes.
  public onStale(listener: StaleListener): () => void {
    this.staleListeners.add(listener);

    return () => this.staleListeners.delete(listener);
  }

  /*
   * A worker defines its patterns as its code runs, before it reports running; an answer or stale mark
   * from an ended worker is ignored.
   */
  public receive(caller: Caller, call: LoaderPageCall): void {
    if (call.action === 'defined') return this.define(caller, call.pattern);

    if (call.action === 'stale') return this.markStale(caller);

    this.settle(caller, call);
  }

  private markStale({ pluginId, generation }: Caller): void {
    if (this.running.get(pluginId) !== generation) return;

    for (const listener of this.staleListeners) listener(pluginId);
  }

  private settle(caller: Caller, call: Answered): void {
    const pending = this.pending.get(call.id);

    if (pending?.generation === caller.generation)
      pending.settle(drawnOf(call));
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
