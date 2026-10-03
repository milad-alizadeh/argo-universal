import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AnyEventObject, createActor, fromCallback } from 'xstate';
import { supervisorMachine } from './machine';

interface FakeWorker {
  send: (event: AnyEventObject) => void;
  stopped: boolean;
}

let home: string;
let workers: FakeWorker[];

const fakeWorker = fromCallback<AnyEventObject, { watch: boolean }>(
  ({ sendBack }) => {
    const worker: FakeWorker = { send: sendBack, stopped: false };
    workers.push(worker);
    return () => {
      worker.stopped = true;
    };
  },
);

const latestWorker = () => {
  const worker = workers.at(-1);
  if (!worker) throw new Error('No worker was started');
  return worker;
};

const serverJsonPath = () => join(home, 'server.json');
const readServerJson = () => JSON.parse(readFileSync(serverJsonPath(), 'utf8'));
const otherServerAddress = {
  pid: process.pid + 1,
  port: 7337,
  version: '1.2.3',
  startedAt: '2026-10-02T00:00:00.000Z',
};
const writeOtherServerJson = () =>
  writeFileSync(serverJsonPath(), JSON.stringify(otherServerAddress));

function startSupervisor() {
  return createActor(
    supervisorMachine.provide({ actors: { worker: fakeWorker } }),
    {
      input: {
        home,
        version: '1.2.3',
        startedAt: '2026-10-03T00:00:00.000Z',
        watch: false,
      },
    },
  ).start();
}

const crashLatestWorker = () =>
  latestWorker().send({ type: 'worker.exit', code: 1 });

// Crashes the worker and returns how long the supervisor waited before it started the next one.
function crashAndWaitForRestart() {
  const before = workers.length;
  crashLatestWorker();
  let waited = 0;
  while (workers.length === before) {
    if (waited >= 60_000) throw new Error('The worker was not restarted');
    vi.advanceTimersByTime(100);
    waited += 100;
  }
  return waited;
}

function keepRunningFor(milliseconds: number) {
  latestWorker().send({ type: 'worker.ready', port: 7337 });
  for (let waited = 0; waited < milliseconds; waited += 1000) {
    vi.advanceTimersByTime(1000);
    latestWorker().send({ type: 'worker.heartbeat' });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  home = mkdtempSync(join(tmpdir(), 'argo-supervisor-'));
  workers = [];
});

afterEach(() => {
  vi.useRealTimers();
  rmSync(home, { recursive: true, force: true });
});

describe('supervisor', () => {
  it('writes server.json with its own pid and the worker port once the worker is ready', () => {
    const supervisor = startSupervisor();
    expect(existsSync(serverJsonPath())).toBe(false);

    latestWorker().send({ type: 'worker.ready', port: 7337 });

    expect(supervisor.getSnapshot().value).toBe('running');
    expect(readServerJson()).toEqual({
      pid: process.pid,
      port: 7337,
      version: '1.2.3',
      startedAt: '2026-10-03T00:00:00.000Z',
    });
  });

  it('stays running while heartbeats arrive', () => {
    const supervisor = startSupervisor();
    latestWorker().send({ type: 'worker.ready', port: 7337 });

    for (let second = 0; second < 10; second++) {
      vi.advanceTimersByTime(1000);
      latestWorker().send({ type: 'worker.heartbeat' });
    }

    expect(supervisor.getSnapshot().value).toBe('running');
    expect(workers).toHaveLength(1);
  });

  it('restarts a worker that exits, and keeps server.json', () => {
    const supervisor = startSupervisor();
    latestWorker().send({ type: 'worker.ready', port: 7337 });

    crashLatestWorker();
    expect(supervisor.getSnapshot().value).toBe('backingOff');
    vi.advanceTimersByTime(500);
    latestWorker().send({ type: 'worker.ready', port: 7337 });

    expect(workers).toHaveLength(2);
    expect(supervisor.getSnapshot().value).toBe('running');
    expect(readServerJson().pid).toBe(process.pid);
  });

  it('stops and restarts a worker that misses its heartbeat', () => {
    const supervisor = startSupervisor();
    latestWorker().send({ type: 'worker.ready', port: 7337 });

    vi.advanceTimersByTime(5000);

    expect(supervisor.getSnapshot().value).toBe('backingOff');
    expect(workers[0]?.stopped).toBe(true);
    vi.advanceTimersByTime(500);
    expect(workers).toHaveLength(2);
  });

  it('restarts a worker that never becomes ready', () => {
    startSupervisor();

    vi.advanceTimersByTime(15_000);
    vi.advanceTimersByTime(500);

    expect(workers[0]?.stopped).toBe(true);
    expect(workers).toHaveLength(2);
  });

  it('doubles the restart delay after each crash, up to 30 seconds', () => {
    startSupervisor();
    const delays: number[] = [];

    for (let crash = 0; crash < 7; crash++)
      delays.push(crashAndWaitForRestart());

    expect(delays).toEqual([500, 1000, 2000, 4000, 8000, 16_000, 30_000]);
  });

  it('fails, removes server.json, and stops after 10 crashes in 10 minutes', () => {
    const supervisor = startSupervisor();
    latestWorker().send({ type: 'worker.ready', port: 7337 });

    for (let crash = 0; crash < 9; crash++) crashAndWaitForRestart();
    expect(supervisor.getSnapshot().value).toBe('starting');
    crashLatestWorker();

    expect(supervisor.getSnapshot().value).toBe('failed');
    expect(supervisor.getSnapshot().status).toBe('done');
    expect(existsSync(serverJsonPath())).toBe(false);
  });

  it('forgets crashes older than 10 minutes', () => {
    const supervisor = startSupervisor();

    for (let crash = 0; crash < 9; crash++) crashAndWaitForRestart();
    keepRunningFor(10 * 60_000);

    expect(crashAndWaitForRestart()).toBe(500);
    expect(supervisor.getSnapshot().value).toBe('starting');
  });

  it('stops the worker and removes server.json when asked to stop', () => {
    const supervisor = startSupervisor();
    latestWorker().send({ type: 'worker.ready', port: 7337 });

    supervisor.send({ type: 'server.stop' });

    expect(supervisor.getSnapshot().value).toBe('stopping');
    expect(supervisor.getSnapshot().status).toBe('done');
    expect(latestWorker().stopped).toBe(true);
    expect(existsSync(serverJsonPath())).toBe(false);
  });

  it('leaves a server.json with another pid when it fails', () => {
    const supervisor = startSupervisor();
    writeOtherServerJson();

    for (let crash = 0; crash < 9; crash++) crashAndWaitForRestart();
    crashLatestWorker();

    expect(supervisor.getSnapshot().value).toBe('failed');
    expect(readServerJson()).toEqual(otherServerAddress);
  });

  it('leaves a server.json with another pid when asked to stop', () => {
    const supervisor = startSupervisor();
    writeOtherServerJson();

    supervisor.send({ type: 'server.stop' });

    expect(supervisor.getSnapshot().value).toBe('stopping');
    expect(readServerJson()).toEqual(otherServerAddress);
  });
});
