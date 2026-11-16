import type {
  PluginDataRequest,
  PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
import type { LoaderPageCall } from '@repo/contracts/plugins/page-address';
import type { Watch } from '@repo/contracts/plugins/watch-api';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';
import { runtimeError } from '../protocol/runtime-status';
import { drawReader } from './draw-reads';
import { renderContext } from './render-context';
import { swallowed } from './swallowed';

type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

type Params = Record<string, string | number | boolean>;

// How a Watch runs one of its Plugin's Operations for a Project.
export type RunOperation = (
  name: string,
  params: Params,
  caller: { projectId?: string },
) => Promise<WireJson>;

export type WatchCalls = {
  data: (request: PluginDataRequest) => Promise<PluginDataState>;
  pages: (call: LoaderPageCall) => Promise<void>;
  run: RunOperation;
};

/*
 * The functions a Plugin gave `argo.watch.define`, by path. The host runs one for a Project with a draw that
 * names its path and is a `watch`; it answers that it loaded, or fails with why, by the draw's id.
 */
export class Watches {
  private readonly defined = new Map<string, Watch>();

  public constructor(private readonly calls: WatchCalls) {}

  public readonly define = (path: string, watch: Watch): void => {
    if (!path.startsWith('/'))
      throw new Error(`A Watch path starts with /: ${path}`);

    this.defined.set(path, watch);
  };

  // Throws unless a Watch path the manifest names was defined; no path is nothing to check.
  public readonly require = (path: string | undefined): void => {
    if (path !== undefined && !this.defined.has(path))
      throw new Error(`Watch path ${path} is not defined by argo.watch.define`);
  };

  public answer(event: DrawEvent): void {
    void this.settle(event);
  }

  private async settle(event: DrawEvent): Promise<void> {
    const { pages } = this.calls;

    try {
      await this.run(event);
      await pages({ action: 'loaded', id: event.id });
    } catch (error) {
      await pages({
        action: 'failed',
        id: event.id,
        error: runtimeError(error),
      }).catch(swallowed);
    }
  }

  private async run(event: DrawEvent): Promise<void> {
    const watch = this.defined.get(event.path);

    if (!watch) throw new Error(`No Watch at ${event.path}`);

    const read = drawReader(this.calls.data);
    const { projectId } = event;

    await watch(
      Object.freeze({
        context: renderContext(event),
        read: (query) => read(query, false),
        run: (name, params = {}) => this.calls.run(name, params, { projectId }),
      }),
    );
  }
}
