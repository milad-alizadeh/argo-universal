import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import type { Database } from '@repo/db';
import type { AgentIdentity } from '@repo/mocks/agent';
import { findFreePort } from '@repo/mocks/network/free-port';
import { createInstallationPorts } from '@repo/mocks/registry/installation';
import { onTestFinished } from 'vitest';
import { waitFor } from 'xstate';
import { composeEngine, type EngineActor } from '../src/engine/compose';
import type { EngineInput } from '../src/engine/machine';
import { fixtureRegistry } from './agent-fixtures';
import { openTestDatabase } from './database';
import { readEngineTestHost, type EngineConnections } from './engine-read';
import { seedTestCommands } from './engine-seed';
import { MemoryKeychain } from './memory-keychain';
import { shippedFolder } from './runtime-plugins';
import { scriptedEngineInput } from './scripted-engine';

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
  const port = options.port ?? (await findFreePort());
  seedTestCommands(options, home, storage);

  const engine = composeEngine(testEngineInput(options, home, port)).start();

  const stop = registerEngineCleanup(engine, storage);
  await waitFor(engine, (snapshot) => snapshot.matches({ live: 'running' }));

  return engineTestHost(engine, home, { port, stop });
}

const engineTestHost = (
  engine: EngineActor,
  home: string,
  control: { port: number; stop: () => Promise<void> },
): EngineTestHost => ({
  ...readEngineTestHost(engine),
  home,
  blobsFolder: join(home, 'blobs'),
  url: `http://127.0.0.1:${control.port}`,
  stop: control.stop,
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
): EngineInput => ({
  ...baseInput(options, home),
  ...options,
  home,
  port,
});

const baseInput = (
  options: EngineTestOptions,
  home: string,
): Omit<EngineInput, 'port'> => ({
  version: '1.2.3',
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
  | 'keychain'
  | 'userHome'
>;

const fixtureServices = (
  options: EngineTestOptions,
  home: string,
): FixtureServices => ({
  fetchAgents: fetchFixtureRegistry(options),
  installationPorts: createInstallationPorts(),
  firstPartyPluginsDirectory: join(home, shippedFolder),
  keychain: new MemoryKeychain(),
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
