import type { PluginAccess } from './plugin-access';
import { fetchCall, type FetchContext } from './plugin-fetch';
import { fsCall } from './plugin-file-calls';
import { argoTimeoutMs } from './plugin-limits';
import { PluginProcesses, type CheckedProcessCall } from './plugin-processes';
import type { FetchCall, FsCall, PluginValue } from './runtime-protocol';

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

  async fs(access: PluginAccess, call: FsCall): Promise<PluginValue> {
    this.assertOpen();

    return fsCall(access, call);
  }

  async process(call: CheckedProcessCall): Promise<PluginValue> {
    this.assertOpen();

    return this.processes.handle(call);
  }

  async fetch(
    call: FetchCall,
    context: Omit<FetchContext, 'signal'>,
  ): Promise<PluginValue> {
    this.assertOpen();
    const request = new AbortController();
    const done = this.timed(request);

    try {
      return await fetchCall(call, { ...context, signal: request.signal });
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
