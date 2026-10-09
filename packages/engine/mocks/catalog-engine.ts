import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { createMockAdapter } from '@repo/mocks/agent';
import { onTestFinished } from 'vitest';
import { createActor, waitFor, type SnapshotFrom } from 'xstate';
import { engineMachine } from '../src/engine/machine';
import type { FetchAgents } from '../src/services/agents';

type CatalogEngine = ReturnType<typeof createActor<typeof engineMachine>>;
type StartedCatalogEngine = {
  engine: CatalogEngine;
  url: string;
  stop(): Promise<void>;
};
const defaults = {
  version: '1',
  startedAt: new Date().toISOString(),
  adapters: [createMockAdapter()],
  now: Date.now,
  createId: randomUUID,
};
const isRunning = (snapshot: SnapshotFrom<typeof engineMachine>): boolean =>
  snapshot.matches({ live: 'running' });

export async function startCatalogEngine(
  home: string,
  fetchAgents: FetchAgents,
): Promise<StartedCatalogEngine> {
  const port = await findFreePort();
  const engine = createActor(engineMachine, {
    input: { ...defaults, home, fetchAgents, port },
  }).start();
  const stop = registerEngineStop(engine);
  await waitFor(engine, isRunning);
  return { engine, url: `http://127.0.0.1:${port}/trpc/agents.catalog`, stop };
}

function registerEngineStop(engine: CatalogEngine): () => Promise<void> {
  const stop = async (): Promise<void> => {
    if (engine.getSnapshot().status !== 'active') return;
    engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
    await waitFor(engine, (snapshot): boolean => snapshot.status === 'done');
  };
  onTestFinished(stop);
  return stop;
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject): void => {
    const socket = createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', (): void => {
      const address = socket.address();
      if (!address || typeof address === 'string')
        throw new Error('Missing test port');
      socket.close((error): void =>
        error ? reject(error) : resolve(address.port),
      );
    });
  });
}
