import type { Database } from '@repo/db';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromCallback,
  fromPromise,
  type SnapshotFrom,
} from 'xstate';
import {
  type DirectedGraphNode,
  type EventExecutor,
  TestModel,
  type TestPath,
  toDirectedGraph,
} from 'xstate/graph';
import type { EngineMessage } from '../supervisor/engine-message';
import type { HttpServer, HttpServerOptions } from './http-server';
import { engineMachine } from './machine';

// The Engine sends a heartbeat every second.
const heartbeatIntervalMs = 1000;

interface PendingCall<TInput, TOutput> {
  input: TInput;
  resolve: (output: TOutput) => void;
  reject: (error: unknown) => void;
}

// A promise actor that records each call in `calls()` and settles only when an executor says so.
const createPromiseMock = <TOutput, TInput>(
  calls: () => PendingCall<TInput, TOutput>[],
) =>
  fromPromise<TOutput, TInput>(
    ({ input }) =>
      new Promise<TOutput>((resolve, reject) => {
        calls().push({ input, resolve, reject });
      }),
  );

let openDatabaseCalls: PendingCall<{ home: string }, Database>[];
let recoveryCalls: PendingCall<
  { database: Database; blobsFolder: string },
  void
>[];
let startHttpServerCalls: PendingCall<HttpServerOptions, HttpServer>[];
let closeHttpServerCalls: PendingCall<{ server: HttpServer | null }, void>[];
let shutdownCommands: string[];
let logs: string[];
let processSignals: { send: (event: AnyEventObject) => void; live: boolean };
let messages: EngineMessage[];
let databaseCloses: number;
let engine: Actor<typeof machine>;

const mockDatabase = {
  $client: {
    close: () => {
      databaseCloses += 1;
    },
  },
} as unknown as Database;
// The closeHttpServer mock stands in for `close()`, so the handle itself is never called.
const mockHttpServer: HttpServer = {
  close: () => expect.unreachable('The machine closes through closeHttpServer'),
};

const machineWithExternalMocks = engineMachine.provide({
  actors: {
    openDatabase: createPromiseMock(() => openDatabaseCalls),
    recoverAfterRestart: createPromiseMock(() => recoveryCalls),
    startHttpServer: createPromiseMock(() => startHttpServerCalls),
    closeHttpServer: createPromiseMock(() => closeHttpServerCalls),
    processSignals: fromCallback(({ sendBack }) => {
      const signals = { send: sendBack, live: true };
      processSignals = signals;
      return () => {
        signals.live = false;
      };
    }),
  },
  actions: {
    sendToSupervisor: (_, message) => {
      messages.push(message);
    },
    log: (_, params) => {
      logs.push(params.line);
    },
  },
});
const machine = machineWithExternalMocks.provide({
  actions: {
    stopSessions: () => shutdownCommands.push('sessions.stopAll'),
    drainWriter: () => shutdownCommands.push('writer.drain'),
  },
});
type EngineSnapshot = SnapshotFrom<typeof machine>;
type EngineEvent = EventFromLogic<typeof machine>;

const input = {
  home: '/unused',
  port: 7337,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  // No Agents, so the registry never probes a real CLI.
  adapters: [],
};
const openError = new Error('database is locked');
const recoveryError = new Error('repair failed');
const listenError = Object.assign(new Error('listen EADDRINUSE'), {
  code: 'EADDRINUSE',
});
const closeError = new Error('close failed');
// Done and error events of invoked actors are not in the machine's event type, but the model drives them.
const payloads: Record<string, AnyEventObject> = {
  'xstate.error.actor.recoverAfterRestart': {
    type: 'xstate.error.actor.recoverAfterRestart',
    error: recoveryError,
    actorId: 'recoverAfterRestart',
  },
  'xstate.done.actor.openDatabase': {
    type: 'xstate.done.actor.openDatabase',
    output: mockDatabase,
    actorId: 'openDatabase',
  },
  'xstate.error.actor.openDatabase': {
    type: 'xstate.error.actor.openDatabase',
    error: openError,
    actorId: 'openDatabase',
  },
  'xstate.done.actor.startHttpServer': {
    type: 'xstate.done.actor.startHttpServer',
    output: mockHttpServer,
    actorId: 'startHttpServer',
  },
  'xstate.error.actor.startHttpServer': {
    type: 'xstate.error.actor.startHttpServer',
    error: listenError,
    actorId: 'startHttpServer',
  },
  'xstate.error.actor.closeHttpServer': {
    type: 'xstate.error.actor.closeHttpServer',
    error: closeError,
    actorId: 'closeHttpServer',
  },
  'xstate.error.actor.sessions': {
    type: 'xstate.error.actor.sessions',
    error: new Error('stop failed'),
  },
  'xstate.error.actor.databaseWriter': {
    type: 'xstate.error.actor.databaseWriter',
    error: new Error('drain failed'),
  },
  'engine.stop': { type: 'engine.stop', reason: 'SIGTERM' },
};
const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge) => edge.label.text),
  ...node.children.flatMap(eventTypes),
];
// The machine raises `xstate.done.state.*` itself, so the model must not send it.
const events = [...new Set(eventTypes(toDirectedGraph(machine)))]
  .filter((type) => !type.startsWith('xstate.done.state.'))
  .map((type) => (payloads[type] ?? { type }) as EngineEvent);

const model = new TestModel(machine, {
  input,
  events,
  limit: 1000,
  // A done actor ignores events, so the model must not send any.
  filterEvents: (snapshot, event) =>
    snapshot.status === 'active' && snapshot.can(event),
  // Never the handles themselves; `via` gives the heartbeat self-transition its own vertex.
  serializeState: (snapshot, event, previous) =>
    JSON.stringify({
      value: snapshot.value,
      database: snapshot.context.database !== null,
      server: snapshot.context.server !== null,
      failure: snapshot.context.failure !== null,
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
  stateMatcher: (snapshot, key) => snapshot.matches(key as never),
});

const latest = <TCall>(calls: TCall[]) =>
  calls.at(-1) ?? expect.unreachable('The actor was not invoked');

// Settles a mock promise, then lets the machine take its done or error event.
const settle = async (settleCall: () => void) => {
  settleCall();
  await vi.advanceTimersByTimeAsync(0);
};

const executors: Record<string, EventExecutor<EngineSnapshot, EngineEvent>> = {
  'xstate.init': () => {
    engine = createActor(machine, { input }).start();
  },
  'xstate.done.actor.openDatabase': () =>
    settle(() => latest(openDatabaseCalls).resolve(mockDatabase)),
  'xstate.error.actor.openDatabase': () =>
    settle(() => latest(openDatabaseCalls).reject(openError)),
  'xstate.done.actor.recoverAfterRestart': () =>
    settle(() => latest(recoveryCalls).resolve()),
  'xstate.error.actor.recoverAfterRestart': () =>
    settle(() => latest(recoveryCalls).reject(recoveryError)),
  'xstate.done.actor.startHttpServer': () =>
    settle(() => latest(startHttpServerCalls).resolve(mockHttpServer)),
  'xstate.error.actor.startHttpServer': () =>
    settle(() => latest(startHttpServerCalls).reject(listenError)),
  'xstate.done.actor.closeHttpServer': () =>
    settle(() => latest(closeHttpServerCalls).resolve()),
  'xstate.error.actor.closeHttpServer': () =>
    settle(() => latest(closeHttpServerCalls).reject(closeError)),
  'xstate.done.actor.sessions': () =>
    engine.system.get('sessions').send({ type: 'sessions.stopAll' }),
  'xstate.error.actor.sessions': () =>
    engine.send({
      type: 'xstate.error.actor.sessions',
      error: new Error('stop failed'),
    }),
  'xstate.done.actor.databaseWriter': () =>
    engine.system.get('databaseWriter').send({ type: 'writer.drain' }),
  'xstate.error.actor.databaseWriter': () =>
    engine.send({
      type: 'xstate.error.actor.databaseWriter',
      error: new Error('drain failed'),
    }),
  'xstate.after.httpCloseLimit.engine.live.stopping.closingHttp': () => {
    vi.advanceTimersByTime(5000);
  },
  'xstate.after.sessionStopLimit.engine.live.stopping.stoppingSessions': () => {
    vi.advanceTimersByTime(10000);
  },
  'xstate.after.writerDrainLimit.engine.live.stopping.drainingWriter': () => {
    vi.advanceTimersByTime(5000);
  },
  'xstate.after.heartbeatInterval.engine.live.running': () => {
    const sent = messages.length;
    vi.advanceTimersByTime(heartbeatIntervalMs - 1);
    expect(messages).toHaveLength(sent);
    vi.advanceTimersByTime(1);
    expect(messages).toHaveLength(sent + 1);
  },
  'engine.stop': () =>
    processSignals.send({ type: 'engine.stop', reason: 'SIGTERM' }),
};

const expectModelState = (expected: EngineSnapshot) => {
  const actual = engine.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.context.database).toBe(expected.context.database);
  expect(actual.context.server).toBe(expected.context.server);
  expect(actual.context.failure).toBe(expected.context.failure);
};
// Final states close the database they opened, stop listening for signals, and exit with a code.
const expectExit = (snapshot: EngineSnapshot, exitCode: number) => {
  expectModelState(snapshot);
  expect(engine.getSnapshot().output).toEqual({ exitCode });
  expect(databaseCloses).toBe(snapshot.context.database === null ? 0 : 1);
  expect(processSignals.live).toBe(false);
};
const states: Record<string, (snapshot: EngineSnapshot) => void> = {
  openingDatabase: (snapshot) => {
    expectModelState(snapshot);
    expect(openDatabaseCalls).toEqual([
      expect.objectContaining({ input: { home: input.home } }),
    ]);
    expect(startHttpServerCalls).toEqual([]);
    expect(messages).toEqual([]);
    expect(processSignals.live).toBe(true);
  },
  recovering: (snapshot) => {
    expectModelState(snapshot);
    expect(recoveryCalls).toEqual([
      expect.objectContaining({
        input: { database: mockDatabase, blobsFolder: '/unused/blobs' },
      }),
    ]);
    expect(startHttpServerCalls).toEqual([]);
    expect(messages).toEqual([]);
    expect(databaseCloses).toBe(0);
  },
  'live.listening': (snapshot) => {
    expectModelState(snapshot);
    expect(startHttpServerCalls).toEqual([
      expect.objectContaining({
        input: {
          home: input.home,
          port: 7337,
          version: '1.2.3',
          startedAt: input.startedAt,
          database: mockDatabase,
          sessions: expect.anything(),
        },
      }),
    ]);
    expect(messages).toEqual([]);
  },
  'live.running': (snapshot) => {
    expectModelState(snapshot);
    expect(messages[0]).toEqual({ type: 'ready', port: 7337 });
    expect(messages.slice(1)).toEqual(
      messages.slice(1).map(() => ({ type: 'heartbeat' })),
    );
    expect(databaseCloses).toBe(0);
  },
  'live.stopping.closingHttp': (snapshot) => {
    expectModelState(snapshot);
    expect(closeHttpServerCalls).toEqual([
      expect.objectContaining({ input: { server: snapshot.context.server } }),
    ]);
    expect(databaseCloses).toBe(0);
    expect(shutdownCommands).toEqual([]);
    expect(engine.system.get('sessions')).toBeDefined();
    expect(engine.system.get('databaseWriter')).toBeDefined();
  },
  'live.stopping.stoppingSessions': (snapshot) => {
    expectModelState(snapshot);
    expect(shutdownCommands).toEqual(['sessions.stopAll']);
    expect(databaseCloses).toBe(0);
    expect(engine.system.get('databaseWriter')).toBeDefined();
  },
  'live.stopping.drainingWriter': (snapshot) => {
    expectModelState(snapshot);
    expect(shutdownCommands).toEqual(['sessions.stopAll', 'writer.drain']);
    expect(databaseCloses).toBe(0);
  },
  stopped: (snapshot) => expectExit(snapshot, 0),
  failed: (snapshot) => expectExit(snapshot, 1),
};

const paths = model.getShortestPaths();
const title = (path: TestPath<EngineSnapshot, EngineEvent>) =>
  path.steps
    .map(({ event }) =>
      event.type
        .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
        .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1'),
    )
    .join(' → ');

beforeEach(() => {
  vi.useFakeTimers();
  openDatabaseCalls = [];
  recoveryCalls = [];
  startHttpServerCalls = [];
  closeHttpServerCalls = [];
  shutdownCommands = [];
  logs = [];
  messages = [];
  databaseCloses = 0;
});

afterEach(() => {
  engine.stop();
  vi.useRealTimers();
});

const startRunningEngine = async (logic = machine) => {
  engine = createActor(logic, { input }).start();
  await settle(() => latest(openDatabaseCalls).resolve(mockDatabase));
  await settle(() => latest(recoveryCalls).resolve());
  await settle(() => latest(startHttpServerCalls).resolve(mockHttpServer));
};

it('finishes shutdown when the Session registry and writer complete immediately', async () => {
  await startRunningEngine(machineWithExternalMocks);
  engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
  await settle(() => latest(closeHttpServerCalls).resolve());
  expect(engine.getSnapshot().status).toBe('done');
  expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
  expect(databaseCloses).toBe(1);
  expect(logs.some((line) => line.includes('limit reached'))).toBe(false);
});

it('keeps draining the writer when Sessions finish after their stop limit', async () => {
  await startRunningEngine();
  engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
  await settle(() => latest(closeHttpServerCalls).resolve());
  vi.advanceTimersByTime(10000);
  expect(logs).toContain('Session stop limit reached; draining the writer');
  engine.system.get('sessions').send({ type: 'sessions.stopAll' });
  expect(
    engine.getSnapshot().matches({ live: { stopping: 'drainingWriter' } }),
  ).toBe(true);
  expect(databaseCloses).toBe(0);
  expect(shutdownCommands).toEqual(['sessions.stopAll', 'writer.drain']);
  engine.system.get('databaseWriter').send({ type: 'writer.drain' });
  expect(engine.getSnapshot().status).toBe('done');
  expect(databaseCloses).toBe(1);
});

describe('engine model', () => {
  it.each(paths.map((path) => [title(path), path] as const))(
    '%s',
    async (_, path) => {
      await path.test({ events: executors, states });
    },
  );

  it('the generated paths walk every transition', () => {
    expect(
      unwalkedTransitions({
        models: [model],
        paths,
        stateKey: (snapshot) => JSON.stringify(snapshot.value),
        eventKey: (event) => event.type,
      }),
    ).toEqual([]);
  });
});
