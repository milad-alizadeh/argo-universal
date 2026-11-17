import { Worker } from 'node:worker_threads';
import { expect, it, onTestFinished } from 'vitest';
import type { HostMessage, PluginEntry } from '../protocol/runtime';
import type { WorkerRecord } from './start-worker';
import { HostWorkers } from './workers';

const bundle = 'kit bundle';

const entry = (pluginId: string): PluginEntry => ({
  pluginId,
  directory: '/nowhere',
  main: 'index.js',
  generation: 0,
});

// A worker that does nothing, so the test sees what the host starts it with and no Plugin runs.
function idleWorker(generation: number): WorkerRecord {
  const worker = new Worker('setInterval(() => {}, 1000)', { eval: true });

  onTestFinished(() => worker.terminate());

  return {
    generation,
    worker,
    deadline: setTimeout(() => {}, 0),
    heartbeat: null,
  };
}

interface Start {
  pluginId: string;
  kit: string;
}

interface Host {
  workers: HostWorkers;
  starts: Start[];
  reported: HostMessage[];
}

function hostOver(kit: () => Promise<string>): Host {
  const starts: Start[] = [];
  const reported: HostMessage[] = [];

  const workers = new HostWorkers((message) => reported.push(message), {
    kit,
    start: (started, bundled): WorkerRecord => {
      starts.push({ pluginId: started.pluginId, kit: bundled });

      return idleWorker(started.generation);
    },
  });

  return { workers, starts, reported };
}

it('bundles the kit once in the host and starts every Plugin worker with that bundle', async () => {
  let bundles = 0;

  const { workers, starts } = hostOver(async () => {
    bundles += 1;

    return bundle;
  });

  workers.activate(entry('first'));
  workers.activate(entry('second'));
  await expect.poll(() => starts.length).toBe(2);
  workers.activate(entry('third'));
  await expect.poll(() => starts.length).toBe(3);

  expect(bundles).toBe(1);
  expect(starts.map(({ kit }) => kit)).toEqual(Array(3).fill(bundle));

  for (const { pluginId } of starts) workers.stop(pluginId);
});

it('starts a Plugin once however often it is activated while the kit bundles', async () => {
  const { workers, starts } = hostOver(async () => bundle);

  workers.activate(entry('first'));
  workers.activate(entry('first'));
  await expect.poll(() => starts.length).toBe(1);

  workers.stop('first');
});

it('starts no worker for a Plugin stopped while the kit bundles', async () => {
  const release = Promise.withResolvers<string>();
  const { workers, starts } = hostOver(() => release.promise);

  workers.activate(entry('first'));
  workers.stop('first');
  release.resolve(bundle);
  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(starts).toEqual([]);
});

it('reports a Plugin crashed when the kit does not bundle', async () => {
  const { workers, reported } = hostOver(() =>
    Promise.reject(new Error('no esbuild')),
  );

  workers.activate(entry('first'));

  await expect
    .poll(() => reported)
    .toEqual([
      expect.objectContaining({
        type: 'status',
        pluginId: 'first',
        state: 'crashed',
      }),
    ]);
});
