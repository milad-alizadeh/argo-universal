import { Worker } from 'node:worker_threads';
import type { PluginEntry } from '../protocol/runtime.ts';
import { workerDeadline } from './worker-deadline.ts';

const heapLimitMb = 64;

export type WorkerRecord = {
  generation: number;
  worker: Worker;
  deadline: ReturnType<typeof setTimeout>;
  heartbeat: ReturnType<typeof setTimeout> | null;
};

// The worker runs `worker/process.ts` with the Plugin's entry and the kit the host bundled.
const spawn = (entry: PluginEntry, kit: string): Worker =>
  new Worker(new URL('../worker/process.ts', import.meta.url), {
    workerData: { entry, kit },
    resourceLimits: { maxOldGenerationSizeMb: heapLimitMb },
  });

export const startWorker = (
  entry: PluginEntry,
  kit: string,
  failed: (error: string, hanging: boolean) => void,
): WorkerRecord => ({
  generation: entry.generation,
  worker: spawn(entry, kit),
  deadline: workerDeadline('initializing', failed),
  heartbeat: null,
});

export function stopWorker(record: WorkerRecord): void {
  clearTimeout(record.deadline);

  if (record.heartbeat) clearTimeout(record.heartbeat);
  void record.worker.terminate();
}
