import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { openDatabase } from '@repo/db';
import type { Database } from '@repo/db';
import type { AgentIdentity } from '@repo/mocks/agent';
import { findFreePort } from '@repo/mocks/network/free-port';
import { onTestFinished } from 'vitest';
import { waitFor, type ActorRefFrom } from 'xstate';
import { composeEngine, type EngineActor } from '../src/engine/compose';
import type { HttpServer } from '../src/engine/http-server';
import type { EngineInput } from '../src/engine/machine';
import { findMachineActor } from '../src/lib/machine-actor';
import type { OpenSessionsActorRef } from '../src/sessions';
import { openSessionsId, openSessionsMachine } from '../src/sessions';
import { databaseWriterId, writerMachine } from '../src/storage';
import { seedAgentFixtures } from './agent-fixtures';
import { openTestDatabase } from './database';
import { type ScriptedProcess } from './scripted-agent';
import { scriptedEngineInput } from './scripted-engine';

const readinessSettleMs = 15_000;
const settlePollMs = 10;

// A module's test drives the Engine through here: modules never import engine/.
export { engineMachine } from '../src/engine/machine';
export type { EngineMessage } from '../src/engine/ipc';

type ScriptedLaunches = { processes?: ScriptedProcess[] } | undefined;
type EngineTestOptions = Partial<EngineInput> & {
  fixtureAgents?: readonly AgentIdentity[];
  database?: Database;
  runtimeDirectory?: string;
  // A test about Server start reads the launches its Readiness checks made.
  keepStartupLaunches?: boolean;
  acp?: EngineInput['acp'] & ScriptedLaunches;
};

type EngineConnections = {
  engine: EngineActor;
  database: Database;
  openSessions: OpenSessionsActorRef;
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

function resolveTestStorage(options: EngineTestOptions): {
  storage: ReturnType<typeof openTestDatabase> | undefined;
  home: string;
} {
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
  return { storage, home };
}

// A supplied database seeds the same file; Engine owns and closes its own connection.
export async function startEngineTestHost(
  options: EngineTestOptions = {},
): Promise<EngineTestHost> {
  const { storage, home } = resolveTestStorage(options);
  const port = options.port ?? (await findFreePort());
  seedTestCommands(options, home, storage);
  const engine = composeEngine({
    version: '1.2.3',
    startedAt: '2026-10-03T00:00:00.000Z',
    now: Date.now,
    createId: randomUUID,
    ...scriptedEngineInput(),
    fetchAgents: async () => ({ version: '1.0.0', agents: [] }),
    ...options,
    home,
    port,
  }).start();
  const stop = registerEngineCleanup(engine, storage);
  await waitFor(engine, (snapshot) => snapshot.matches({ live: 'running' }));
  const connections = readEngineTestHost(engine);
  await settleStartupReadiness(connections.caller, options);
  return {
    ...connections,
    home,
    blobsFolder: join(home, 'blobs'),
    url: `http://127.0.0.1:${port}`,
    stop,
  };
}

function readEngineTestHost(engine: EngineActor): EngineConnections {
  const { database, server } = engine.getSnapshot().context;
  const openSessions = findMachineActor(
    engine.system,
    openSessionsId,
    openSessionsMachine,
  );
  const databaseWriter = findMachineActor(
    engine.system,
    databaseWriterId,
    writerMachine,
  );
  if (!database || !server || !openSessions || !databaseWriter)
    throw new Error('Engine is not ready');
  return {
    engine,
    database,
    openSessions,
    databaseWriter,
    createCaller: server.createCaller,
    caller: server.createCaller(),
  };
}

// A scripted program that only exits when told still exits once its startup check stops it.
const exitStoppedChecks = (launched: ScriptedLaunches): void => {
  for (const process of launched?.processes ?? [])
    if (process.terminations) process.exited.resolve();
};
// Every Server-start check must stop the program it launched.
const requireStoppedChecks = (launched: ScriptedLaunches): void => {
  const leaked = (launched?.processes ?? []).filter(
    ({ terminations }) => terminations < 1,
  );
  if (leaked.length > 0)
    throw new Error(
      `${leaked.length} Server-start check left its Agent running`,
    );
};

async function settle(
  caller: EngineConnections['caller'],
  whileChecking: () => void,
): Promise<void> {
  const deadline = performance.now() + readinessSettleMs;
  while (await isChecking(caller)) {
    if (performance.now() > deadline)
      throw new Error('Agent Readiness did not settle');
    whileChecking();
    // Real time: a test's fake clock must not move while the Engine checks.
    await delay(settlePollMs);
  }
}

// Waits through the public list until no Agent is Checking…, as an App would see it.
export const awaitSettledReadiness = (
  caller: EngineConnections['caller'],
): Promise<void> => settle(caller, () => {});

// Server start checks every Agent; a test begins once that settles and every check stopped its Agent, with only its own launches recorded.
async function settleStartupReadiness(
  caller: EngineConnections['caller'],
  options: EngineTestOptions,
): Promise<void> {
  const launched = options.acp;
  await settle(caller, () => exitStoppedChecks(launched));
  requireStoppedChecks(launched);
  if (!options.keepStartupLaunches) launched?.processes?.splice(0);
}

const isChecking = async (
  caller: EngineConnections['caller'],
): Promise<boolean> =>
  (await caller.agents.list()).some(
    ({ enabled, status }) => enabled && status === 'checking',
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

function seedTestCommands(
  options: EngineTestOptions,
  home: string,
  storage: ReturnType<typeof openTestDatabase> | undefined,
): void {
  const seeded =
    options.database ??
    storage?.database ??
    openDatabase(join(home, 'argo.db'));
  seedAgentFixtures(
    seeded,
    options.fixtureAgents ?? [{ agent: 'mock', label: 'mock', logo: '' }],
  );
  if (!options.database && !storage) seeded.$client.close();
}
