import { Worker } from 'node:worker_threads';
import type { PluginEntry } from '../protocol/runtime.ts';

const heapLimitMb = 64;

export type WorkerRecord = {
  generation: number;
  worker: Worker;
  // Unset until the thread is running, so the time a loaded machine takes to start it is not counted.
  deadline?: ReturnType<typeof setTimeout>;
  heartbeat: ReturnType<typeof setTimeout> | null;
};

export function startWorker(entry: PluginEntry): Worker {
  return new Worker(new URL('../worker/process.ts', import.meta.url), {
    workerData: entry,
    resourceLimits: { maxOldGenerationSizeMb: heapLimitMb },
  });
}
