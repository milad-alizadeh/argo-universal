import {
  matchPagePath,
  type LoaderPageCall,
  type PageAddress,
} from '@repo/contracts/plugins/page-address';
import {
  treeAnswer,
  type DrawAnswer,
  type DrawPacing,
  type LiveAnswer,
} from '@repo/contracts/plugins/page-draw';
import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import { QueryIntervals } from '../data/query-intervals';
import type { Caller, KindCalls, WorkerCalls } from '../runtime/worker-calls';
import { checkedPage } from './checked-tree';
import {
  answeredError,
  drawingOf,
  failed,
  loadedOf,
  outcomeOf,
  type Answered,
  type DrawAt,
  type Drawing,
  type Loaded,
  type Outcome,
} from './draw-calls';
import { LatestFrames, liveAnswers } from './live-frames';

/*
 * How long a Loader may read before its draw fails. A Loader awaits the Plugin's own reads, such as a
 * `gh` call, so it is given as long as an Operation.
 */
const drawLimitMs = 30_000;

// A drawn tree as checked for any App to draw, `live` when its Loader yields.
export type Drawn =
  | { ok: true; root: WireNode; pages: number; live?: true }
  | { ok: false; error: string };

// The trees last sent for each address a Plugin drew, kept until its running generation ends.
type Sent = Map<string, WireNode>;

type SentAt = { last: WireNode | undefined; keep: (root: WireNode) => void };

// Two Apps showing one address with different page counts share one entry, so each may get whole trees.
const sentKey = ({ pages: _pages, ...address }: DrawAt): string =>
  JSON.stringify(address);

// What a draw's pacing depends on: its path, and whether its Loader yields.
type DrawnAt = { path: string; live?: true };

// Where a background pass runs a Loader alone: its Page path and the Project it reads for.
export type LoadAt = { path: string; projectId: string };

/*
 * Hears a Plugin's pages go stale: every one after a write, which names no addresses, or the addresses
 * whose last draw read a Query answer that changed.
 */
type ChangeListener = (pluginId: string, addresses?: PageAddress[]) => void;

// What a write makes due before anyone hears of it, so a page drawn again reads past it.
type Written = (pluginId: string) => void;

// The patterns one worker generation defined as its code ran, each with the interval it is drawn again on, as clamped.
type Defined = {
  generation: number;
  patterns: Map<string, number | undefined>;
};

// Where a live draw's worker sends each tree its Loader yields.
type FrameListener = (root: WireJson) => void;

/*
 * The runtime side of Loader pages (ADR-0050): each draw, and each background pass's load, is one call to
 * the running worker generation, answered by its id, and each generation tells the Page path patterns it
 * defined as it starts.
 */
export class PluginDraws {
  private readonly defined = new Map<string, Defined>();
  private readonly sent = new Map<string, Sent>();
  private readonly changeListeners = new Set<ChangeListener>();
  private readonly calls: KindCalls<DrawAt, Answered, Outcome>;
  private readonly frames = new WeakMap<DrawAt, FrameListener>();
  private readonly intervals: QueryIntervals;

  public constructor(
    private readonly workers: WorkerCalls,
    private readonly log: (line: string) => void,
    private readonly written: Written,
  ) {
    this.calls = workers.kind({
      event: (id, at) => ({ type: 'draw', id, ...at }),
      limitMs: drawLimitMs,
      result: outcomeOf,
    });
    this.intervals = new QueryIntervals(log);
    workers.watch((pluginId) => this.forgetEnded(pluginId));
  }

  // Only the running generation's patterns count; a new one defines its pages again as its code runs.
  public patternsOf(pluginId: string): string[] {
    const defined = this.defined.get(pluginId);

    const running = this.workers.generation(pluginId);

    return defined && defined.generation === running
      ? [...defined.patterns.keys()]
      : [];
  }

  // The interval the first pattern the path matches is drawn again on, as clamped, while its generation runs.
  private everyOf(pluginId: string, path: string): number | undefined {
    const defined = this.defined.get(pluginId);

    if (!defined || defined.generation !== this.workers.generation(pluginId))
      return undefined;

    const matched = defined.patterns
      .entries()
      .find(([pattern]) => matchPagePath(pattern, path) !== null);

    return matched?.[1];
  }

  private pacingOf(pluginId: string, drawn: DrawnAt): DrawPacing {
    const every = this.everyOf(pluginId, drawn.path);

    return {
      ...(every !== undefined && { every }),
      ...(drawn.live && { live: true }),
    };
  }

  /*
   * The draw's answer to an App that keeps the tree `known` names: unchanged, the rows a load more appended
   * to the tree last sent for the address, or the whole tree (ADR-0050). A Server that restarted, or a Plugin
   * that ran again, sent no trees and answers whole ones.
   */
  public async answer(
    pluginId: string,
    address: DrawAt,
    known?: string,
  ): Promise<DrawAnswer> {
    const drawn = await this.draw(pluginId, address);

    if (!drawn.ok) return { kind: 'failed', error: drawn.error };

    const sent = this.sentAt(pluginId, sentKey(address));
    const answer = treeAnswer(drawn.root, sent.last, known);

    sent.keep(drawn.root);

    const pacing = this.pacingOf(pluginId, { ...drawn, path: address.path });

    return { ...answer, pages: drawn.pages, ...pacing };
  }

  /*
   * A live page's answers for one subscription (ADR-0050): one live draw on the running generation with no
   * deadline, its trees coalesced to one a frame, checked as every tree is and sent as keyed patches after
   * the first. It ends when the Loader does, its generation ends, or the signal aborts, which stops the
   * Loader.
   */
  public live(
    pluginId: string,
    address: DrawAt,
    known: string | undefined,
    signal: AbortSignal,
  ): AsyncGenerator<LiveAnswer> {
    const request: DrawAt = { ...address, live: true };
    const frames = new LatestFrames(this.workers.clock);

    this.frames.set(request, (root) => frames.push(root));
    void this.calls.call(pluginId, request, null).then((outcome) => {
      this.frames.delete(request);
      frames.end(outcome);
    });

    const { log } = this;
    const at = { pluginId, path: address.path, log };

    return liveAnswers({
      frames,
      known,
      signal,
      check: (root) => checkedPage(at, { root, pages: 0 }),
      stop: () => this.calls.tell(request, (id) => ({ type: 'stop', id })),
    });
  }

  // The tree last sent for an address, and keeping the next; only while a generation runs, so a Plugin released mid-draw keeps nothing.
  private sentAt(pluginId: string, key: string): SentAt {
    const keep = (root: WireNode): void => {
      if (this.workers.generation(pluginId) === undefined) return;

      const sent = this.sent.get(pluginId) ?? new Map<string, WireNode>();

      this.sent.set(pluginId, sent.set(key, root));
    };

    return { last: this.sent.get(pluginId)?.get(key), keep };
  }

  private async draw(pluginId: string, address: DrawAt): Promise<Drawn> {
    const outcome = await this.calls.call(pluginId, address);

    if ('ok' in outcome) return outcome;

    if (outcome.action !== 'drawn') return failed(answeredError(outcome));

    const { log } = this;
    const checked = checkedPage({ pluginId, path: address.path, log }, outcome);

    return checked.ok && outcome.live ? { ...checked, live: true } : checked;
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

  // The draw still waiting on the caller's generation that a Loader's read names, or none.
  public drawing(caller: Caller, draw: number): Drawing | undefined {
    const at = this.calls.request(caller, draw);
    const every = at && this.everyOf(caller.pluginId, at.path);

    return drawingOf(caller.pluginId, draw, { at, every });
  }

  // The addresses whose last draw read a Query answer that has since changed.
  public heldChanged(pluginId: string, addresses: PageAddress[]): void {
    for (const listener of this.changeListeners) listener(pluginId, addresses);
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
    if (call.action === 'defined') return this.define(caller, call);

    if (call.action === 'changed') return this.changed(caller);

    if (call.action === 'frame') return this.framed(caller, call);

    this.calls.answer(caller, call);
  }

  // A frame counts only from the generation its live draw still waits on.
  private framed(
    caller: Caller,
    { id, root }: Extract<LoaderPageCall, { action: 'frame' }>,
  ): void {
    const request = this.calls.request(caller, id);

    if (request) this.frames.get(request)?.(root);
  }

  private changed(caller: Caller): void {
    if (this.workers.current(caller)) this.notify(caller.pluginId);
  }

  private notify(pluginId: string): void {
    this.written(pluginId);

    for (const listener of this.changeListeners) listener(pluginId);
  }

  // A pattern defined twice keeps its first interval, as a draw matches the first page defined for it.
  private define(
    { pluginId, generation }: Caller,
    { pattern, every }: Extract<LoaderPageCall, { action: 'defined' }>,
  ): void {
    const kept = this.defined.get(pluginId);

    const defined =
      kept?.generation === generation
        ? kept
        : { generation, patterns: new Map<string, number | undefined>() };

    if (!defined.patterns.has(pattern))
      defined.patterns.set(
        pattern,
        this.intervals.page(pluginId, pattern, every),
      );

    this.defined.set(pluginId, defined);
  }

  private forgetEnded(pluginId: string): void {
    this.sent.delete(pluginId);
    this.intervals.release(pluginId);

    const running = this.workers.generation(pluginId);

    if (this.defined.get(pluginId)?.generation !== running)
      this.defined.delete(pluginId);
  }
}
