import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PluginEntry, type HostMessage } from '../protocol/runtime.ts';
import { HostWorkers } from './workers.ts';

// A thread stand-in: it emits what the real Worker emits and ignores what the host posts to it.
class FakeWorker extends EventEmitter {
  postMessage(): void {}

  terminate(): Promise<number> {
    return Promise.resolve(0);
  }
}

const entry = PluginEntry.parse({
  pluginId: 'p',
  generation: 1,
  directory: '/plugin',
  main: 'index.mjs',
});

let reports: HostMessage[];

let worker: FakeWorker;

beforeEach(() => {
  vi.useFakeTimers();
  reports = [];
  worker = new FakeWorker();
  new HostWorkers((message) => reports.push(message)).activate(
    entry,
    () => worker,
  );
});

afterEach(() => vi.useRealTimers());

const crashed = (): boolean =>
  reports.some((m) => m.type === 'status' && m.state === 'crashed');

it('starts the deadline when the thread is online, not when it is spawned', () => {
  vi.advanceTimersByTime(60_000);
  expect(crashed()).toBe(false);

  worker.emit('online');
  vi.advanceTimersByTime(2999);
  expect(crashed()).toBe(false);
  vi.advanceTimersByTime(1);
  expect(reports).toMatchObject([{ state: 'crashed', hanging: true }]);
});

it('stops waiting once the worker is alive', () => {
  worker.emit('online');
  worker.emit('message', 'alive');
  vi.advanceTimersByTime(60_000);

  expect(crashed()).toBe(false);
});

it('gives Plugin code a fresh deadline once it executes, and crashes a hang', () => {
  worker.emit('online');
  worker.emit('message', 'alive');
  vi.advanceTimersByTime(60_000);
  worker.emit('message', 'executing');
  vi.advanceTimersByTime(2999);
  expect(crashed()).toBe(false);

  vi.advanceTimersByTime(1);
  expect(reports).toMatchObject([{ state: 'crashed', hanging: true }]);
});

it('reports running when the worker is ready after executing', () => {
  worker.emit('online');
  worker.emit('message', 'alive');
  worker.emit('message', 'executing');
  worker.emit('message', 'ready');
  vi.advanceTimersByTime(500);

  expect(reports).toMatchObject([{ state: 'running' }]);
});
