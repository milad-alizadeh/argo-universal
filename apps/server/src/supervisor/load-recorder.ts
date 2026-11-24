import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { EngineLoad } from '@repo/engine/ipc';
import { sampleHostLoad } from './host-load';

const sampleIntervalMs = 15_000;

const fileLimitBytes = 2_097_152;

type Reason = 'periodic' | 'missed-heartbeat' | 'missed-voice-pong';

type Recorder = {
  engine: (load: EngineLoad) => void;
  record: (reason: Reason) => void;
  stop: () => void;
};

async function appendSnapshot(home: string, line: string): Promise<void> {
  const logs = join(home, 'logs');
  const path = join(logs, 'load.log');
  await mkdir(logs, { recursive: true });

  const info = await stat(path).catch(() => null);

  if (info && info.size + Buffer.byteLength(line) > fileLimitBytes)
    await rename(path, join(logs, 'load.log.1'));

  await appendFile(path, line, { mode: 0o600 });
}

type EngineWindow = EngineLoad & { maxLagMs: number; maxCpuPercent: number };

type RecordingWindow = Pick<Recorder, 'engine'> & {
  flush: () => Promise<void>;
};

function recordWindow(home: string, pending: Set<Reason>): RecordingWindow {
  let latest: EngineWindow | null = null;

  const engine = (load: EngineLoad): void => {
    latest = {
      ...load,
      maxLagMs: Math.max(load.lagMs, latest?.maxLagMs ?? 0),
      maxCpuPercent: Math.max(load.cpuPercent, latest?.maxCpuPercent ?? 0),
    };
  };

  return {
    engine,
    async flush(): Promise<void> {
      const timestamp = new Date().toISOString();
      const reasons = [...pending];
      const previous = latest;

      pending.clear();

      if (previous) latest = { ...previous, maxLagMs: 0, maxCpuPercent: 0 };

      const host = await sampleHostLoad(process.pid, previous?.pid);

      const heartbeatAgeMs = previous
        ? Date.parse(timestamp) - previous.sampledAt
        : null;

      await appendSnapshot(
        home,
        JSON.stringify({
          timestamp,
          reasons,
          engine: previous,
          heartbeatAgeMs,
          ...host,
        }) + '\n',
      );
    },
  };
}

export function startLoadRecorder(home: string): Recorder {
  const pending = new Set<Reason>();
  const window = recordWindow(home, pending);

  let writing = false;
  let stopped = false;

  async function flush(): Promise<void> {
    writing = true;

    try {
      while (!stopped && pending.size > 0) await window.flush();
    } catch {
      // Diagnostics must never stop the Supervisor.
    } finally {
      writing = false;
    }
  }

  const record = (reason: Reason): void => {
    if (stopped) return;

    pending.add(reason);

    if (!writing) void flush();
  };

  const timer = setInterval(record, sampleIntervalMs, 'periodic').unref();

  return {
    engine: window.engine,
    record,
    stop(): void {
      stopped = true;
      clearInterval(timer);
    },
  };
}
