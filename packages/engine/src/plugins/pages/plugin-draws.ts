import type {
  LoaderPageCall,
  PageAddress,
} from '@repo/contracts/plugins/page-address';
import {
  treeAnswer,
  type DrawAnswer,
  type DrawPacing,
  type TreeAnswer,
} from '@repo/contracts/plugins/page-draw';
import type { LiveAnswer } from '@repo/contracts/plugins/page-live';
import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Caller, KindCalls, WorkerCalls } from '../runtime/worker-calls';
import { checkedPage } from './checked-tree';
import { DefinedPatterns } from './defined-patterns';
import {
  answeredError,
  drawingOf,
  drawKind,
  failed,
  loadedOf,
  type Answered,
  type DrawAt,
  type Drawing,
  type Loaded,
  type Outcome,
} from './draw-calls';
import { LiveDraws, type LiveFollow } from './live-draws';
import { SentTrees } from './sent-trees';
import { drawsForApp, forApp } from './wire-minimum';

// A drawn tree as checked for any App to draw, `live` when its Loader yields.
export type Drawn =
  | { ok: true; root: WireNode; pages: number; live?: true }
  | { ok: false; error: string };

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

/*
 * The runtime side of Loader pages (ADR-0050): each draw, and each background pass's load, is one call to
 * the running worker generation, answered by its id, and each generation tells the Page path patterns it
 * defined as it starts.
 */
export class PluginDraws {
  private readonly patterns: DefinedPatterns;
  private readonly lives: LiveDraws;
  private readonly sent: SentTrees;
  private readonly changeListeners = new Set<ChangeListener>();
  private readonly calls: KindCalls<DrawAt, Answered, Outcome>;

  public constructor(
    private readonly workers: WorkerCalls,
    private readonly log: (line: string) => void,
    private readonly written: Written,
  ) {
    this.calls = workers.kind(drawKind);
    this.sent = new SentTrees(workers);
    this.patterns = new DefinedPatterns(workers, log);
    this.lives = new LiveDraws({
      calls: this.calls,
      clock: workers.clock,
      log,
    });
    workers.watch((pluginId) => this.forgetEnded(pluginId));
  }

  // Only the running generation's patterns count; a new one defines its pages again as its code runs.
  public patternsOf(pluginId: string): string[] {
    return this.patterns.patternsOf(pluginId);
  }

  private pacingOf(pluginId: string, drawn: DrawnAt): DrawPacing {
    const every = this.patterns.everyOf(pluginId, drawn.path);

    return {
      ...(every !== undefined && { every }),
      ...(drawn.live && { live: true }),
    };
  }

  /*
   * The draw's answer to an App that keeps the tree `known` names: unchanged, the rows a load more appended
   * to the tree last sent for the address, or the whole tree (ADR-0050). A Server that restarted, or a Plugin
   * that ran again, sent no trees and answers whole ones. An App below the wire minimum is answered "Update
   * Argo" (ADR-0034), and the tree it was not sent is not kept as sent.
   */
  public async answer(
    pluginId: string,
    address: DrawAt,
    known?: string,
  ): Promise<DrawAnswer> {
    const { log } = this;
    const drawn = forApp(
      { pluginId, at: address, log },
      await this.draw(pluginId, address),
    );

    if (!drawn.ok) return { kind: 'failed', error: drawn.error };

    const answer = this.treeFor(pluginId, address, { root: drawn.root, known });

    const pacing = this.pacingOf(pluginId, { ...drawn, path: address.path });

    return { ...answer, pages: drawn.pages, ...pacing };
  }

  // The tree the App is sent, as an append to the tree last sent for the address when it may be.
  private treeFor(
    pluginId: string,
    address: DrawAt,
    { root, known }: { root: WireNode; known: string | undefined },
  ): TreeAnswer {
    if (!drawsForApp(address)) return treeAnswer(root, undefined, known);

    const sent = this.sent.at(pluginId, address);
    const answer = treeAnswer(root, sent.last, known);

    sent.keep(root);

    return answer;
  }

  // A live page's answers for one subscription (ADR-0050).
  public live(follow: LiveFollow): AsyncGenerator<LiveAnswer> {
    return this.lives.follow(follow);
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
    const at = this.calls.request(caller, draw);
    const every = at && this.patterns.everyOf(caller.pluginId, at.path);

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
    if (call.action === 'frame') return this.lives.framed(caller, call);

    this.received(caller, call);
  }

  private received(
    caller: Caller,
    call: Exclude<LoaderPageCall, { action: 'frame' }>,
  ): void {
    if (call.action === 'defined') return this.patterns.define(caller, call);

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

  private forgetEnded(pluginId: string): void {
    this.sent.forget(pluginId);
    this.patterns.forget(pluginId);
  }
}
