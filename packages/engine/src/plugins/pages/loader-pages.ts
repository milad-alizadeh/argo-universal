import type {
  PageAddress,
  PageRun,
  PageRunAnswer,
  StaleMark,
} from '@repo/contracts/plugins/page-address';
import { prepareWireTree } from '@repo/contracts/plugins/prepare-tree';
import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import { WireNode, type WireJson } from '@repo/contracts/plugins/wire';
import { pluginPageBytes } from '@repo/contracts/plugins/wire-limits';
import type { PluginOperationService } from '../operations';
import { sanitizeTree } from '../visual/sanitize-tree';
import type { PluginDraws } from './plugin-draws';
import { StaleMarks } from './stale-marks';

export type PageAnswer =
  | { ok: true; root: WireNode }
  | { ok: false; error: string };

// What drawing needs of the Plugin service: a running worker, started on the first draw as a page starts it.
export type PagesHost = {
  activate: (pluginId: string) => Promise<PluginStatus>;
};

const failed = (error: string): PageAnswer => ({ ok: false, error });

export class LoaderPages {
  private readonly marks = new StaleMarks();
  private readonly unwatch: () => void;

  public constructor(
    private readonly host: PagesHost,
    private readonly draws: PluginDraws,
    private readonly operations: PluginOperationService,
  ) {
    this.unwatch = operations.onRan((pluginId) =>
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
    ...address
  }: PageAddress): Promise<PageAnswer> {
    const started = await this.started(pluginId);

    if (started) return failed(started);

    const drawn = await this.draws.draw(pluginId, address);

    return drawn.ok ? checked(drawn.root) : drawn;
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

  private async started(pluginId: string): Promise<string | undefined> {
    const status = await this.host.activate(pluginId);

    if (status.state === 'running') return undefined;

    return status.error ?? `Plugin ${pluginId} is not running`;
  }
}

// The worker's tree is the Plugin's own JSON: it is parsed, capped, sanitised and prepared as a view's is.
function checked(root: WireJson): PageAnswer {
  const parsed = WireNode.safeParse(root);

  if (!parsed.success) return failed('The page drew an invalid Plugin tree');

  const tooLarge = sizeReason(parsed.data, 'page');

  if (tooLarge) return failed(tooLarge);

  const prepared = prepareWireTree(sanitizeTree(parsed.data).root);

  return preparedAnswer(prepared);
}

function preparedAnswer(prepared: WireNode): PageAnswer {
  const tooLarge = sizeReason(prepared, 'prepared page');

  return tooLarge ? failed(tooLarge) : { ok: true, root: prepared };
}

const sizeReason = (tree: WireNode, kind: string): string | undefined =>
  Buffer.byteLength(JSON.stringify(tree), 'utf8') > pluginPageBytes
    ? `${kind} exceeds ${pluginPageBytes} bytes`
    : undefined;
