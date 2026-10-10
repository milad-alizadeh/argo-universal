import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import type { Database } from '@repo/db';
import { findFreePort } from '@repo/mocks/network/free-port';
import { onTestFinished } from 'vitest';
import { createActor, waitFor, type Actor, type ActorRefFrom } from 'xstate';
import type { HttpServer } from '../src/engine/http-server';
import { engineMachine, type EngineInput } from '../src/engine/machine';
import { findMachineActor } from '../src/lib/machine-actor';
import { databaseWriterId, writerMachine } from '../src/services/feed';
import type { RegistryActorRef } from '../src/services/sessions';
import { sessionRegistryId, registryMachine } from '../src/services/sessions';
import { openTestDatabase } from './database';
import { scriptedEngineInput } from './scripted-engine';

type EngineTestOptions = Partial<EngineInput> & {
  database?: Database;
  runtimeDirectory?: string;
};

type EngineConnections = {
  engine: Actor<typeof engineMachine>;
  database: Database;
  sessionRegistry: RegistryActorRef;
  databaseWriter: ActorRefFrom<typeof writerMachine>;
  createCaller: HttpServer['createCaller'];
  caller: ReturnType<HttpServer['createCaller']>;
};
type EngineTestHost = EngineConnections & {
  home: string;
  blobsFolder: string;
  url: string;
  stop: () => Promise<void>;
};

// A supplied database seeds the same file; Engine owns and closes its own connection.
export async function startEngineTestHost(
  options: EngineTestOptions = {},
): Promise<EngineTestHost> {
  const storage =
    options.database || options.home || options.runtimeDirectory
      ? undefined
      : openTestDatabase();
  const home =
    options.home ??
    (options.database
      ? dirname(options.database.$client.location() ?? '')
      : (options.runtimeDirectory ?? storage?.directory));
  if (!home) throw new Error('Engine test storage is missing');
  const port = options.port ?? (await findFreePort());
  const engine = createActor(engineMachine, {
    input: {
      version: '1.2.3',
      startedAt: '2026-10-03T00:00:00.000Z',
      now: Date.now,
      createId: randomUUID,
      ...scriptedEngineInput(),
      fetchAgents: async () => ({ version: '1.0.0', agents: [] }),
      ...options,
      home,
      port,
    },
  }).start();
  const stop = registerEngineCleanup(engine, storage);
  await waitFor(engine, (snapshot) => snapshot.matches({ live: 'running' }));
  return {
    ...readEngineTestHost(engine),
    home,
    blobsFolder: join(home, 'blobs'),
    url: `http://127.0.0.1:${port}`,
    stop,
  };
}

function readEngineTestHost(
  engine: Actor<typeof engineMachine>,
): EngineConnections {
  const { database, server } = engine.getSnapshot().context;
  const sessionRegistry = findMachineActor(
    engine.system,
    sessionRegistryId,
    registryMachine,
  );
  const databaseWriter = findMachineActor(
    engine.system,
    databaseWriterId,
    writerMachine,
  );
  if (!database || !server || !sessionRegistry || !databaseWriter)
    throw new Error('Engine is not ready');
  return {
    engine,
    database,
    sessionRegistry,
    databaseWriter,
    createCaller: server.createCaller,
    caller: server.createCaller(),
  };
}

function registerEngineCleanup(
  engine: Actor<typeof engineMachine>,
  storage: ReturnType<typeof openTestDatabase> | undefined,
): () => Promise<void> {
  const stop = async (): Promise<void> => {
    if (engine.getSnapshot().status !== 'active') return;
    engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
    await waitFor(engine, (snapshot) => snapshot.status === 'done');
  };
  onTestFinished(async () => {
    await stop();
    storage?.remove();
  });
  return stop;
}
