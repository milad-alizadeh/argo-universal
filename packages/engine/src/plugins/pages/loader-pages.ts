import type {
  PageRun,
  PageRunAnswer,
  StaleMark,
} from '@repo/contracts/plugins/page-address';
import type {
  DrawAnswer,
  DrawRequest,
} from '@repo/contracts/plugins/page-draw';
import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import type { PluginOperationService } from '../operations';
import { checkedTree } from './checked-tree';
import type { Drawn, PluginDraws } from './plugin-draws';
import { StaleMarks } from './stale-marks';
import { TreeAnswers } from './tree-answers';

// What drawing needs of the Plugin service: a running worker, started on the first draw as a page starts it.
export type PagesHost = {
  activate: (pluginId: string) => Promise<PluginStatus>;
};

const failedDraw = (error: string): DrawAnswer => ({ kind: 'failed', error });

export class LoaderPages {
  private readonly marks = new StaleMarks();
  private readonly answers = new TreeAnswers();
  private readonly unwatch: () => void;

  // An Operation's run, or the Plugin's own `argo.changed()`, marks every Loader page of the Plugin.
  public constructor(
    private readonly host: PagesHost,
    private readonly draws: PluginDraws,
    private readonly operations: PluginOperationService,
  ) {
    this.unwatch = draws.onChanged((pluginId) =>
      this.marks.mark({ pluginId, stale: draws.patternsOf(pluginId) }),
    );
  }

  public stale(signal: AbortSignal): AsyncGenerator<StaleMark> {
    return this.marks.watch(signal);
  }

  public close(): void {
    this.unwatch();
    this.marks.close();
  }

  public async draw({
    pluginId,
    known,
    ...at
  }: DrawRequest): Promise<DrawAnswer> {
    const started = await this.started(pluginId);

    if (started) return failedDraw(started);

    const drawn = await this.draws.draw(pluginId, {
      ...at,
      pages: at.pages ?? 1,
    });

    return this.answered(drawn, known);
  }

  public async patterns(pluginId: string): Promise<string[]> {
    const started = await this.started(pluginId);

    if (started) throw new Error(started);

    return this.draws.patternsOf(pluginId);
  }

  /*
   * Every Loader page of the Plugin is stale after one of its Operations: the Engine keeps no record of
   * what a Loader read, so it cannot narrow the set (ADR-0050).
   */
  public async run(run: PageRun): Promise<PageRunAnswer> {
    const { pluginId, operation, args, projectId, sessionId } = run;

    const result = await this.operations.run({
      pluginId,
      name: operation,
      params: args,
      caller: { projectId, sessionId },
    });

    return { result, stale: this.draws.patternsOf(pluginId) };
  }

  private answered(drawn: Drawn, known?: string): DrawAnswer {
    if (!drawn.ok) return failedDraw(drawn.error);

    const tree = checkedTree(drawn.root, 'page');

    return tree.ok
      ? this.answers.answer(tree.root, drawn.pages, known)
      : failedDraw(tree.error);
  }

  private async started(pluginId: string): Promise<string | undefined> {
    const status = await this.host.activate(pluginId);

    if (status.state === 'running') return undefined;

    return status.error ?? `Plugin ${pluginId} is not running`;
  }
}
