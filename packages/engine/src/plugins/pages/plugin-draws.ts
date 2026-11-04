import type { LoaderPageCall } from '@repo/contracts/plugins/page-address';
import {
  treeAnswer,
  type DrawAnswer,
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
  passAt,
  type Answered,
  type DrawAt,
  type LoadAt,
  type Drawing,
  type Loaded,
  type Outcome,
} from './draw-calls';
import {
  DrawingFailures,
  type DrawnFor,
  type Drawings,
} from './drawing-failures';
import { LiveDraws, type LiveFollow } from './live-draws';
import type { PageChanges } from './page-changes';
import { SentTrees } from './sent-trees';
import { drawsForApp, forApp } from './wire-minimum';

// A drawn tree as checked for any App to draw, `live` when its Loader yields.
export type Drawn =
  | { ok: true; root: WireNode; pages: number; live?: true }
  | { ok: false; error: string };

export type { LoadAt } from './draw-calls';

// The running workers, the Server log, the Plugins' changes the draws hear, and the drawing failures the App shows.
type PluginDrawsDeps = {
  workers: WorkerCalls;
  log: (line: string) => void;
  changes: PageChanges;
  drawings: Drawings;
};

/*
 * The runtime side of Loader pages (ADR-0050): each draw, and each background pass's load, is one call to
 * the running worker generation, answered by its id, and each generation tells the Page path patterns it
 * defined as it starts.
 */
export class PluginDraws {
  private readonly patterns: DefinedPatterns;
  private readonly lives: LiveDraws;
  private readonly sent: SentTrees;
  private readonly changes: PageChanges;
  private readonly calls: KindCalls<DrawAt, Answered, Outcome>;
  private readonly log: (line: string) => void;
  private readonly failures: DrawingFailures;

  public constructor({ workers, log, changes, drawings }: PluginDrawsDeps) {
    const failures = new DrawingFailures(drawings, log);
    const calls = workers.kind(drawKind);

    this.log = log;
    this.failures = failures;
    this.calls = calls;
    this.changes = changes;
    this.sent = new SentTrees(workers);
    this.patterns = new DefinedPatterns(workers, log);
    this.lives = new LiveDraws({ calls, clock: workers.clock, log, failures });
    workers.watch((pluginId) => this.forgetEnded(pluginId));
  }

  // Only the running generation's patterns count; a new one defines its pages again as its code runs.
  public patternsOf(pluginId: string): string[] {
    return this.patterns.patternsOf(pluginId);
  }

  /*
   * The draw's answer to an App that keeps the tree `known` names: unchanged, the rows a load more appended
   * to the tree last sent for the address, or the whole tree (ADR-0050). A Server that restarted, or a Plugin
   * that ran again, sent no trees and answers whole ones. An App below the wire minimum is answered "Update
   * Argo" (ADR-0034), and the tree it was not sent is not kept as sent.
   */
  public async answer(page: DrawnFor, known?: string): Promise<DrawAnswer> {
    const drawn = forApp({ ...page, log: this.log }, await this.draw(page));

    if (!drawn.ok) return { kind: 'failed', error: drawn.error };

    const answer = this.treeFor(page, { root: drawn.root, known });

    const pacing = this.patterns.pacingOf(page.pluginId, {
      ...drawn,
      path: page.at.path,
    });

    return { ...answer, pages: drawn.pages, ...pacing };
  }

  // The tree the App is sent, as an append to the tree last sent for the address when it may be.
  private treeFor(
    page: DrawnFor,
    { root, known }: { root: WireNode; known: string | undefined },
  ): TreeAnswer {
    if (!drawsForApp(page.at)) return treeAnswer(root, undefined, known);

    const sent = this.sent.at(page);
    const answer = treeAnswer(root, sent.last, known);

    sent.keep(root);

    return answer;
  }

  // A live page's answers for one subscription (ADR-0050).
  public live(follow: LiveFollow): AsyncGenerator<LiveAnswer> {
    return this.lives.follow(follow);
  }

  /*
   * A draw that fails, by its Loader or Render or by a tree the Server refuses, is logged once and shown to
   * the App as its Plugin's drawing failure (ADR-0037); the address's next tree clears it. A draw its Plugin
   * stopping ended is not one.
   */
  private async draw(page: DrawnFor): Promise<Drawn> {
    const outcome = await this.calls.call(page.pluginId, page.at);

    if (!('ok' in outcome)) return this.answered(page, outcome);

    return outcome.stopped
      ? failed(outcome.error)
      : this.failures.threw(page, outcome.error);
  }

  private answered(page: DrawnFor, answered: Answered): Drawn {
    if (answered.action !== 'drawn')
      return this.failures.threw(page, answeredError(answered));

    const checking = {
      pluginId: page.pluginId,
      path: page.at.path,
      log: this.log,
    };

    return this.failures.checked(page, checkedPage(checking, answered));
  }

  // A background pass: the Loader alone, for one Project, given the pass's own budget rather than a draw's.
  public async load(
    pluginId: string,
    at: LoadAt,
    limitMs: number,
  ): Promise<Loaded> {
    return loadedOf(await this.calls.call(pluginId, passAt(at), limitMs));
  }

  // The draw still waiting on the caller's generation that a Loader's read names, or none.
  public drawing(caller: Caller, draw: number): Drawing | undefined {
    const at = this.calls.request(caller, draw);
    const every = at && this.patterns.everyOf(caller.pluginId, at.path);

    return drawingOf(caller.pluginId, draw, { at, every });
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

    if (call.action === 'changed') return this.changes.changed(caller);

    this.calls.answer(caller, call);
  }

  private forgetEnded(pluginId: string): void {
    this.sent.forget(pluginId);
    this.patterns.forget(pluginId);
  }
}
