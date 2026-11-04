import type {
  PageAddress,
  PageRun,
  PageRunAnswer,
  StaleMark,
} from '@repo/contracts/plugins/page-address';
import type {
  DrawAnswer,
  DrawRequest,
} from '@repo/contracts/plugins/page-draw';
import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../../rpc';
import { Broadcast } from '../broadcast';
import type { PluginOperationService } from '../operations';
import type { PluginDraws } from './plugin-draws';

// What drawing needs of the Plugin service: a running worker, started on the first draw as a page starts it.
export type PagesHost = {
  activate: (pluginId: string) => Promise<PluginStatus>;
};

// The Connection a draw is for.
export type Asking = Pick<RpcConnection, 'surface' | 'identity'>;

const askedBy = ({
  surface,
  identity,
}: Asking): Pick<
  Extract<PluginEvent, { type: 'draw' }>,
  'serverDevice' | 'surface'
> => ({
  serverDevice: identity?.serverDevice === true,
  ...(surface && { surface }),
});

const failedDraw = (error: string): DrawAnswer => ({ kind: 'failed', error });

export class LoaderPages {
  private readonly marks = new Broadcast<StaleMark>();
  private readonly unwatch: () => void;

  /*
   * An Operation's run, or the Plugin's own `argo.changed()` outside one, marks every Loader page of the
   * Plugin at once: the worker folds a change made inside an Operation into that run's one mark. A Query
   * answer that changed marks the addresses that read it.
   */
  public constructor(
    private readonly host: PagesHost,
    private readonly draws: PluginDraws,
    private readonly operations: PluginOperationService,
  ) {
    this.unwatch = draws.onChanged((pluginId, addresses) =>
      this.mark(pluginId, addresses),
    );
  }

  // A Plugin with no Loader pages has nothing to mark.
  private mark(pluginId: string, addresses?: PageAddress[]): void {
    if (addresses) return this.marks.send({ pluginId, addresses });

    if (this.draws.patternsOf(pluginId).length > 0)
      this.marks.send({ pluginId });
  }

  public stale(signal: AbortSignal): AsyncGenerator<StaleMark> {
    return this.marks.watch(signal);
  }

  public close(): void {
    this.unwatch();
    this.marks.close();
  }

  // The Loader reads, and the Render draws, for the Connection that asked, as a view's opening does.
  public async draw(
    { pluginId, known, ...at }: DrawRequest,
    asking: Asking,
  ): Promise<DrawAnswer> {
    const started = await this.started(pluginId);

    if (started) return failedDraw(started);

    const address = { ...at, ...askedBy(asking) };

    return this.draws.answer(pluginId, address, known);
  }

  public async patterns(pluginId: string): Promise<string[]> {
    const started = await this.started(pluginId);

    if (started) throw new Error(started);

    return this.draws.patternsOf(pluginId);
  }

  // The trees the Operation changed hear of it from its stale mark, which reaches every App (ADR-0050).
  public async run(run: PageRun): Promise<PageRunAnswer> {
    const { pluginId, operation, args, projectId, sessionId } = run;

    const result = await this.operations.run({
      pluginId,
      name: operation,
      params: args,
      caller: { projectId, sessionId },
    });

    return { result };
  }

  private async started(pluginId: string): Promise<string | undefined> {
    const status = await this.host.activate(pluginId);

    if (status.state === 'running') return undefined;

    return status.error ?? `Plugin ${pluginId} is not running`;
  }
}
