import { bundleKit } from '../kit/bundle.ts';
import { runtimeError, type PluginEntry } from '../protocol/runtime.ts';
import type { HostMessage } from '../protocol/runtime.ts';
import { startWorker, type WorkerRecord } from './start-worker.ts';

// How the host starts workers: the kit it bundles once, and how a worker is spawned with it.
export interface WorkerSources {
  kit: () => Promise<string>;
  start: typeof startWorker;
}

export const workerSources: WorkerSources = {
  kit: bundleKit,
  start: startWorker,
};

type Crash = (error: string, hanging: boolean) => void;

// What a start tells the host: the worker once it is spawned, and a crash it later reports.
interface Started {
  record: (record: WorkerRecord) => void;
  crash: Crash;
}

/*
 * The Plugins whose worker waits on the kit, which the host bundles once as it starts. A worker is handed the
 * bundle, so starting one runs no esbuild of the kit; a stop or a second activation meanwhile is seen here.
 */
export class KitStarts {
  private readonly waiting = new Set<string>();
  private kit: Promise<string> | null;
  private readonly bundle: () => Promise<string>;
  private readonly start: typeof startWorker;
  private readonly report: (message: HostMessage) => void;

  constructor(
    { kit, start }: WorkerSources,
    report: (message: HostMessage) => void,
  ) {
    this.start = start;
    this.report = report;
    this.bundle = kit;
    this.kit = this.bundled();
  }

  // A failed bundle is reported to each Plugin that waits on it, and the next start bundles again.
  private bundled(): Promise<string> {
    const kit = this.bundle();

    kit.catch(() => {
      if (this.kit === kit) this.kit = null;
    });

    return kit;
  }

  // Starts the Plugin's worker with the kit once it is bundled, unless it is stopped before then.
  begin(entry: PluginEntry, started: Started): void {
    if (this.waiting.has(entry.pluginId)) return;

    this.waiting.add(entry.pluginId);
    this.kit ??= this.bundled();
    void this.kit.then(
      (kit) => {
        if (this.waiting.delete(entry.pluginId))
          started.record(this.start(entry, kit, started.crash));
      },
      (cause: unknown) => {
        if (this.waiting.delete(entry.pluginId))
          this.report(kitFailed(entry, cause));
      },
    );
  }

  cancel(pluginId: string): void {
    this.waiting.delete(pluginId);
  }
}

const kitFailed = (
  { pluginId, generation }: PluginEntry,
  cause: unknown,
): HostMessage => ({
  type: 'status',
  pluginId,
  generation,
  state: 'crashed',
  hanging: false,
  error: runtimeError(cause),
});
