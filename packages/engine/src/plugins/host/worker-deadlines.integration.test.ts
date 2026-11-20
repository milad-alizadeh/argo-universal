import { MessageChannel, Worker } from 'node:worker_threads';
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest';
import type { HostMessage, PluginEntry } from '../protocol/runtime';
import type { WorkerRecord } from './start-worker';
import { HostWorkers } from './workers';

// Says what the test tells it to the host, then a console line the host reports, and answers pings while the test lets it; it acknowledges each change to that.
const scriptedWorker = `
const { parentPort, workerData } = require('node:worker_threads');
const control = workerData.control;
let answering = true;
parentPort.on('message', (message) => {
  control.postMessage({ heard: message });
  if (message === 'ping' && answering) parentPort.postMessage('pong');
});
control.on('message', (message) => {
  if (message.say) {
    parentPort.postMessage(message.say);
    parentPort.postMessage({ type: 'console', level: 'log', text: 'said' });
  }
  if ('answering' in message) {
    answering = message.answering;
    control.postMessage({ heard: message });
  }
});
`;

const entry: PluginEntry = {
  pluginId: 'plugin',
  directory: '/nowhere',
  main: 'index.js',
  generation: 0,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

// Lets the worker thread and the host trade the messages already sent; real time, since only timers are faked.
async function until(condition: () => boolean): Promise<void> {
  const giveUpAt = performance.now() + 5000;

  while (!condition() && performance.now() < giveUpAt)
    await new Promise((resolve) => setImmediate(resolve));

  expect(condition()).toBe(true);
}

const said = (reported: HostMessage[]): number =>
  reported.filter((message) => message.type === 'console').length;

interface Host {
  reported: HostMessage[];
  heard: unknown[];
  say: (message: string) => Promise<void>;
  answer: (answering: boolean) => Promise<void>;
}

function startHost(): Host {
  const reported: HostMessage[] = [];
  const heard: unknown[] = [];
  const { port1, port2 } = new MessageChannel();
  port1.on('message', (message: { heard: unknown }): void => {
    heard.push(message.heard);
  });

  const workers = new HostWorkers((message) => reported.push(message), {
    kit: async (): Promise<string> => 'kit',
    start: (_started, _kit, failed): WorkerRecord => {
      const worker = new Worker(scriptedWorker, {
        eval: true,
        // No inherited `node --watch` reporting, whose messages the host would refuse.
        env: {},
        workerData: { control: port2 },
        transferList: [port2],
      });

      onTestFinished(() => {
        port1.close();
        void worker.terminate();
      });

      return {
        generation: 0,
        worker,
        deadline: setTimeout(() => failed('initializing', false), 60_000),
        heartbeat: null,
      };
    },
  });

  workers.activate(entry);
  onTestFinished(() => workers.stop(entry.pluginId));

  return {
    reported,
    heard,
    say: async (message): Promise<void> => {
      const before = said(reported);

      port1.postMessage({ say: message });
      await until(() => said(reported) > before);
    },
    // Waits for the worker to take it, so no ping already in flight is answered under the old setting.
    answer: async (answering): Promise<void> => {
      port1.postMessage({ answering });
      await until(() =>
        heard.some(
          (message) =>
            typeof message === 'object' &&
            message !== null &&
            'answering' in message &&
            message.answering === answering,
        ),
      );
    },
  };
}

const statuses = (host: Host): HostMessage[] =>
  host.reported.filter((message) => message.type === 'status');

async function running(host: Host): Promise<void> {
  await host.say('bootstrap-ready');
  await host.say('ready');
  await until(() => statuses(host).length === 1);
  expect(statuses(host)).toMatchObject([{ state: 'running' }]);
}

async function pinged(host: Host, count: number): Promise<void> {
  const pings = (): number => host.heard.filter((m) => m === 'ping').length;

  await vi.advanceTimersByTimeAsync(1000);
  await until(() => pings() >= count);
}

it('flags a Plugin hanging when it does not answer within 3 seconds of starting', async () => {
  const host = startHost();
  await host.say('bootstrap-ready');

  await vi.advanceTimersByTimeAsync(2999);
  expect(statuses(host)).toEqual([]);
  await vi.advanceTimersByTimeAsync(1);

  expect(statuses(host)).toMatchObject([
    {
      state: 'crashed',
      hanging: true,
      error: 'Plugin did not answer within 3 seconds',
    },
  ]);
});

it('keeps a running Plugin whose pong comes after one answer limit but inside the heartbeat window', async () => {
  const host = startHost();
  await running(host);
  await host.answer(false);
  await pinged(host, 1);

  await vi.advanceTimersByTimeAsync(5000);
  await host.say('pong');
  await vi.advanceTimersByTimeAsync(2000);

  expect(statuses(host)).toHaveLength(1);
});

it('flags a running Plugin hanging when it answers no heartbeat for 6 seconds', async () => {
  const host = startHost();
  await running(host);
  await host.answer(false);
  await pinged(host, 1);

  await vi.advanceTimersByTimeAsync(5999);
  expect(statuses(host)).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);

  expect(statuses(host)).toMatchObject([
    { state: 'running' },
    {
      state: 'crashed',
      hanging: true,
      error: 'Plugin did not answer a heartbeat within 6 seconds',
    },
  ]);
});
