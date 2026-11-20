import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import type { Database } from '@repo/db';
import type { AgentIdentity } from '@repo/mocks/agent';
import { createInstallationPorts } from '@repo/mocks/registry/installation';
import { onTestFinished } from 'vitest';
import { waitFor } from 'xstate';
import { composeEngine, type EngineActor } from '../src/engine/compose';
import type { EngineInput } from '../src/engine/machine';
import { fixtureRegistry } from './agent-fixtures';
import { openTestDatabase } from './database';
import { readEngineTestHost, type EngineConnections } from './engine-read';
import { seedTestCommands } from './engine-seed';
import { MemorySecretStore } from './memory-secret-store';
import { shippedFolder } from './runtime-plugins';
import { decided, scriptedEngineInput } from './scripted-engine';

// A module's test drives the Engine through here: modules never import engine/.
export { engineMachine } from '../src/engine/machine';

export type { EngineMessage } from '../src/engine/ipc';

export type EngineTestOptions = Partial<EngineInput> & {
  fixtureAgents?: readonly AgentIdentity[];
  database?: Database;
  runtimeDirectory?: string;
  /** Stores an empty Registry row first, so the Engine skips its Registry fetch at start. */
  storedRegistry?: boolean;
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
  const { home, storage } = resolveTestStorage(options);
  const engine = composeTestEngine(options, home, storage);

  const stop = registerEngineCleanup(engine, storage);
  await waitFor(engine, (snapshot) => snapshot.matches({ live: 'running' }));

  return engineTestHost(readEngineTestHost(engine), home, stop);
}

// Storage opened for an Engine that never starts is removed at once; no cleanup is registered for it.
function composeTestEngine(
  options: EngineTestOptions,
  home: string,
  storage: TestStorage['storage'],
): EngineActor {
  try {
    seedTestCommands(options, home, storage);
    // Port 0 lets the Server bind a free port itself, so no other process can take it first.
    const input = testEngineInput(options, home, options.port ?? 0);

    return composeEngine(input).start();
  } catch (error) {
    storage?.remove();
    throw error;
  }
}

const engineTestHost = (
  connections: EngineConnections,
  home: string,
  stop: () => Promise<void>,
): EngineTestHost => ({
  ...connections,
  home,
  blobsFolder: join(home, 'blobs'),
  url: `http://127.0.0.1:${connections.port}`,
  stop,
});

type TestStorage = {
  home: string;
  storage: ReturnType<typeof openTestDatabase> | undefined;
};

const resolveTestStorage = (options: EngineTestOptions): TestStorage => {
  const storage = chooseTestStorage(options);
  const home = testHome(options, storage);

  if (!home) throw new Error('Engine test storage is missing');

  return { home, storage };
};

const chooseTestStorage = (
  options: EngineTestOptions,
): ReturnType<typeof openTestDatabase> | undefined =>
  hasStorage(options) ? undefined : openTestDatabase();

const hasStorage = (options: EngineTestOptions): boolean =>
  [options.database, options.home, options.runtimeDirectory].some(Boolean);

const testHome = (
  options: EngineTestOptions,
  storage: TestStorage['storage'],
): string | undefined => options.home ?? fallbackHome(options, storage);

const fallbackHome = (
  options: EngineTestOptions,
  storage: TestStorage['storage'],
): string | undefined =>
  options.database
    ? databaseHome(options.database)
    : otherHome(options, storage);

const databaseHome = (database: Database): string =>
  dirname(database.$client.location() ?? '');

const otherHome = (
  options: EngineTestOptions,
  storage: TestStorage['storage'],
): string | undefined => options.runtimeDirectory ?? storage?.directory;

const testEngineInput = (
  options: EngineTestOptions,
  home: string,
  port: number,
): EngineInput =>
  decided({ ...baseInput(options, home), ...options, home, port });

const baseInput = (
  options: EngineTestOptions,
  home: string,
): Omit<EngineInput, 'port'> => ({
  version: '1.2.3',
  // Servers in tests share one computer's name; each announces under its own.
  discoveryName: `Test Server ${randomUUID()}`,
  startedAt: '2026-10-03T00:00:00.000Z',
  now: Date.now,
  createId: randomUUID,
  ...scriptedEngineInput(),
  ...fixtureServices(options, home),
  home,
});

type FixtureServices = Pick<
  EngineInput,
  | 'fetchAgents'
  | 'installationPorts'
  | 'firstPartyPluginsDirectory'
  | 'secretStore'
  | 'userHome'
>;

const fixtureServices = (
  options: EngineTestOptions,
  home: string,
): FixtureServices => ({
  fetchAgents: fetchFixtureRegistry(options),
  installationPorts: createInstallationPorts(),
  firstPartyPluginsDirectory: join(home, shippedFolder),
  secretStore: new MemorySecretStore(),
  userHome: join(home, 'user-home'),
});

const fetchFixtureRegistry =
  (options: EngineTestOptions): NonNullable<EngineInput['fetchAgents']> =>
  async () =>
    JSON.stringify(
      fixtureRegistry(
        options.fixtureAgents ?? [{ agent: 'mock', label: 'mock', logo: '' }],
      ),
    );

function registerEngineCleanup(
  engine: EngineActor,
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
