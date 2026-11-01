import { Worker } from 'node:worker_threads';
import type { z } from 'zod';
import type {
  PluginEntry,
  WorkerCommand,
  WorkerMessage,
} from '../protocol/runtime.ts';

const heapLimitMb = 64;

// What the host uses of a Worker, so a test can stand in for the thread.
export type WorkerPort = {
  on(
    event: 'message',
    listener: (message: z.infer<typeof WorkerMessage>) => void,
  ): void;
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: 'exit', listener: (code: number) => void): void;
  once(event: 'online', listener: () => void): void;
  postMessage(value: WorkerCommand): void;
  terminate(): Promise<number>;
};

export type StartWorker = (entry: PluginEntry) => WorkerPort;

export type WorkerRecord = {
  generation: number;
  worker: WorkerPort;
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
