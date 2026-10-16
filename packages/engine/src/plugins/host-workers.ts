import { Worker } from 'node:worker_threads';
import {
  pluginAnswerLimitMs,
  running,
  runtimeError,
  WorkerMessage,
  type HostMessage,
  type PluginEntry,
  type HostReply,
  type WorkerCall,
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

  // A reply belongs to the worker generation that asked; a reloaded worker never receives it.
  reply({ pluginId, generation, id, reply }: HostReply): void {
    const record = this.workers.get(pluginId);

    if (record?.generation === generation)
      record.worker.postMessage({ type: 'reply', id, reply });
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
        this.parsed(pluginId, record, WorkerMessage.safeParse(message));
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

  // Plugin-controlled data never throws in the host: an invalid message crashes that Plugin alone.
  private parsed(
    pluginId: string,
    record: WorkerRecord,
    parsed: ReturnType<typeof WorkerMessage.safeParse>,
  ): void {
    if (!parsed.success) this.crash(pluginId, 'Plugin sent an invalid message');
    else if (typeof parsed.data === 'string')
      this.answer(pluginId, parsed.data);
    else this.call(pluginId, record, parsed.data);
  }

  // A Plugin waiting on the Server is alive, so a slow call must not count as a hang while it starts.
  private call(pluginId: string, record: WorkerRecord, call: WorkerCall): void {
    if (record.heartbeat === null) this.arm(pluginId, record);

    this.report({
      type: 'call',
      pluginId,
      generation: record.generation,
      id: call.id,
      request: call.request,
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

  private arm(pluginId: string, record: WorkerRecord): void {
    clearTimeout(record.deadline);
    record.deadline = setTimeout(
      () => this.hang(pluginId),
      pluginAnswerLimitMs,
    );
  }

  private ping(pluginId: string, record: WorkerRecord): void {
    this.arm(pluginId, record);
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
