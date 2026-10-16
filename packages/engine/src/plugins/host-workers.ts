import { Worker } from 'node:worker_threads';
import type { z } from 'zod';
import {
  pluginAnswerLimitMs,
  running,
  runtimeError,
  WorkerMessage,
  type HostMessage,
  type PluginEntry,
  type PluginReply,
} from './runtime-protocol.ts';

const heapLimitMb = 64;

const heartbeatIntervalMs = 1000;

type WorkerRecord = {
  generation: number;
  worker: Worker;
  deadline: ReturnType<typeof setTimeout>;
  heartbeat: ReturnType<typeof setInterval> | null;
};

export class HostWorkers {
  private readonly workers = new Map<string, WorkerRecord>();

  private readonly report: (message: HostMessage) => void;

  constructor(report: (message: HostMessage) => void) {
    this.report = report;
  }

  reply(pluginId: string, id: number, reply: PluginReply): void {
    this.workers
      .get(pluginId)
      ?.worker.postMessage({ type: 'reply', id, reply });
  }

  activate(entry: PluginEntry): void {
    if (this.workers.has(entry.pluginId)) return;

    const worker = new Worker(new URL('./worker-process.ts', import.meta.url), {
      workerData: entry,
      resourceLimits: { maxOldGenerationSizeMb: heapLimitMb },
    });

    const record = this.record(entry, worker);
    this.workers.set(entry.pluginId, record);
    this.listen(entry.pluginId, record);
  }

  stop(pluginId: string): void {
    const record = this.workers.get(pluginId);

    if (!record) return;
    this.workers.delete(pluginId);
    clearTimeout(record.deadline);

    if (record.heartbeat) clearInterval(record.heartbeat);
    void record.worker.terminate();
  }

  private record(entry: PluginEntry, worker: Worker): WorkerRecord {
    return {
      generation: entry.generation,
      worker,
      deadline: setTimeout(
        () => this.hang(entry.pluginId),
        pluginAnswerLimitMs,
      ),
      heartbeat: null,
    };
  }

  private listen(pluginId: string, record: WorkerRecord): void {
    record.worker.on('message', (message) => {
      if (this.workers.get(pluginId) === record)
        this.received(pluginId, WorkerMessage.parse(message));
    });
    record.worker.on('error', (error) =>
      this.workerCrashed(pluginId, record, runtimeError(error)),
    );
    record.worker.on('exit', (code) =>
      this.workerCrashed(pluginId, record, `Worker exited (${code})`),
    );
  }

  private workerCrashed(
    pluginId: string,
    record: WorkerRecord,
    error: string,
  ): void {
    if (this.workers.get(pluginId) === record) this.crash(pluginId, error);
  }

  private received(
    pluginId: string,
    message: z.infer<typeof WorkerMessage>,
  ): void {
    if (typeof message === 'string') this.answer(pluginId, message);
    else
      this.report({
        type: 'call',
        pluginId,
        id: message.id,
        request: message.request,
      });
  }

  private answer(pluginId: string, answer: 'ready' | 'pong'): void {
    const record = this.workers.get(pluginId);

    if (!record) return;
    clearTimeout(record.deadline);

    if (answer === 'ready') this.ready(pluginId, record);
    else
      record.heartbeat = setTimeout(
        () => this.ping(pluginId, record),
        heartbeatIntervalMs,
      );
  }

  private ready(pluginId: string, record: WorkerRecord): void {
    this.report({
      type: 'status',
      pluginId,
      generation: record.generation,
      ...running,
    });
    record.heartbeat = setTimeout(
      () => this.ping(pluginId, record),
      heartbeatIntervalMs,
    );
  }

  private ping(pluginId: string, record: WorkerRecord): void {
    record.deadline = setTimeout(
      () => this.hang(pluginId),
      pluginAnswerLimitMs,
    );
    record.worker.postMessage('ping');
  }

  private crash(pluginId: string, error: string, hanging = false): void {
    const record = this.workers.get(pluginId);

    if (!record) return;
    this.stop(pluginId);
    this.report({
      type: 'status',
      pluginId,
      generation: record.generation,
      state: 'crashed',
      hanging,
      error,
    });
  }

  private hang(pluginId: string): void {
    this.crash(pluginId, 'Plugin did not answer within 3 seconds', true);
  }
}
