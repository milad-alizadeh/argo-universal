import type {
  LoaderPageCall,
  PageAddress,
} from '@repo/contracts/plugins/page-address';
import { treeAnswer, type DrawAnswer } from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';
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

/*
 * How long a Loader may read before its draw fails. A Loader awaits the Plugin's own reads, such as a
 * `gh` call, so it is given as long as an Operation.
 */
const drawLimitMs = 30_000;

// A drawn tree as checked for any App to draw.
export type Drawn =
  | { ok: true; root: WireNode; pages: number }
  | { ok: false; error: string };

// The trees last sent for each address a Plugin drew, kept until its running generation ends.
type Sent = Map<string, WireNode>;

type SentAt = { last: WireNode | undefined; keep: (root: WireNode) => void };

// Two Apps showing one address with different page counts share one entry, so each may get whole trees.
const sentKey = ({ pages: _pages, ...address }: DrawAt): string =>
  JSON.stringify(address);

// Where a background pass runs a Loader alone: its Page path and the Project it reads for.
export type LoadAt = { path: string; projectId: string };

/*
 * Hears a Plugin's pages go stale: every one after a write, which names no addresses, or the addresses
 * whose last draw read a Query answer that changed.
 */
type ChangeListener = (pluginId: string, addresses?: PageAddress[]) => void;

// What a write makes due before anyone hears of it, so a page drawn again reads past it.
type Written = (pluginId: string) => void;

// The patterns one worker generation defined as its code ran.
type Defined = { generation: number; patterns: Set<string> };

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

    return { ...answer, pages: drawn.pages };
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

  // The draw still waiting on the caller's generation that a Loader's read names, or none.
  public drawing(caller: Caller, draw: number): Drawing | undefined {
    return drawingOf(caller.pluginId, draw, this.calls.request(caller, draw));
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
    if (call.action === 'defined') return this.define(caller, call.pattern);

    if (call.action === 'changed') return this.changed(caller);

    this.calls.answer(caller, call);
  }

  private changed(caller: Caller): void {
    if (this.workers.current(caller)) this.notify(caller.pluginId);
  }

  private notify(pluginId: string): void {
    this.written(pluginId);

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
    this.sent.delete(pluginId);

    const running = this.workers.generation(pluginId);

    if (this.defined.get(pluginId)?.generation !== running)
      this.defined.delete(pluginId);
  }
}
