import type { AssetContent } from './asset-content';
import { readAssetResponse } from './asset-fetch';
import type { PluginAccess } from './plugin-access';
import { fetchCall, fetchResponse, type FetchContext } from './plugin-fetch';
import type { Hop } from './plugin-fetch-response';
import { fsCall } from './plugin-file-calls';
import { argoTimeoutMs } from './plugin-limits';
import { PluginProcesses, type CheckedProcessCall } from './plugin-processes';
import type { FsCall, PluginValue } from './runtime-protocol';

/*
 * What one Plugin's `argo` calls hold open on the Server: child processes, timers and requests.
 * `release` ends all of them, so a reload, a crash or turning the Plugin off leaves nothing behind.
 */
export class PluginResources {
  private readonly processes = new PluginProcesses();
  private readonly cleanups = new Set<() => void>();
  private released = false;

  release(): void {
    this.released = true;
    this.processes.release();

    for (const cleanup of this.cleanups) cleanup();
  }

  async fs(
    access: PluginAccess,
    call: FsCall,
    path: string,
  ): Promise<PluginValue> {
    this.assertOpen();

    return fsCall(access, call, path);
  }

  public asset(
    hop: Hop,
    context: Omit<FetchContext, 'signal'>,
  ): Promise<AssetContent> {
    return this.request(async (signal) =>
      readAssetResponse(await fetchResponse(hop, { ...context, signal })),
    );
  }

  async process(call: CheckedProcessCall): Promise<PluginValue> {
    this.assertOpen();

    return this.processes.handle(call);
  }

  async fetch(
    hop: Hop,
    context: Omit<FetchContext, 'signal'>,
  ): Promise<PluginValue> {
    return this.request((signal) => fetchCall(hop, { ...context, signal }));
  }

  private async request<T>(
    run: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    this.assertOpen();
    const request = new AbortController();
    const done = this.timed(request);

    try {
      return await run(request.signal);
    } finally {
      done();
    }
  }

  // Aborts a request at the deadline or on `release`; the returned function ends it early.
  private timed(request: AbortController): () => void {
    const timer = setTimeout(() => request.abort(), argoTimeoutMs);

    return this.hold(() => {
      clearTimeout(timer);
      request.abort();
    });
  }

  // Registers something `release` must end; the returned function ends it early and forgets it.
  private hold(cleanup: () => void): () => void {
    const once = (): void => {
      cleanup();
      this.cleanups.delete(once);
    };

    this.cleanups.add(once);

    return once;
  }

  private assertOpen(): void {
    if (this.released) throw new Error('Plugin is stopped');
  }
}

export function supersede(
  held: { generation: number; resources: PluginResources } | undefined,
  generation: number,
): void {
  if (!held) return;

  if (generation < held.generation)
    throw new Error('Plugin worker was replaced');
  held.resources.release();
}
