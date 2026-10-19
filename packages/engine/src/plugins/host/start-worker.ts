import { Worker } from 'node:worker_threads';
import type { PluginEntry } from '../protocol/runtime.ts';

const heapLimitMb = 64;

export type WorkerRecord = {
  generation: number;
  worker: Worker;
  deadline: ReturnType<typeof setTimeout>;
  heartbeat: ReturnType<typeof setInterval> | null;
};

export function startWorker(entry: PluginEntry): Worker {
  return new Worker(new URL('../worker/process.ts', import.meta.url), {
    workerData: entry,
    resourceLimits: { maxOldGenerationSizeMb: heapLimitMb },
  });
}
