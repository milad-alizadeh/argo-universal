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

export function startWorker(
  entry: PluginEntry,
  failed: (error: string, hanging: boolean) => void,
): WorkerRecord {
  const worker = new Worker(new URL('../worker/process.ts', import.meta.url), {
    workerData: entry,
    resourceLimits: { maxOldGenerationSizeMb: heapLimitMb },
  });

  return {
    generation: entry.generation,
    worker,
    deadline: workerDeadline('initializing', failed),
    heartbeat: null,
  };
}
