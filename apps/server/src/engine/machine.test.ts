import type { Database } from '@repo/db';
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
  adjacencyMapToArray,
  type DirectedGraphNode,
  type EventExecutor,
  getAdjacencyMap,
  TestModel,
  type TestPath,
  toDirectedGraph,
} from 'xstate/graph';
import type { EngineMessage } from '../supervisor/engine-message';
import type { HttpServer, HttpServerOptions } from './http-server';
import { engineMachine } from './machine';

// Spec 0001 section 5: the Engine sends a heartbeat every second.
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
let startHttpServerCalls: PendingCall<HttpServerOptions, HttpServer>[];
let closeHttpServerCalls: PendingCall<{ server: HttpServer | null }, void>[];
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

const machine = engineMachine.provide({
  actors: {
    openDatabase: createPromiseMock(() => openDatabaseCalls),
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
    log: () => {},
  },
});
type EngineSnapshot = SnapshotFrom<typeof machine>;
type EngineEvent = EventFromLogic<typeof machine>;

const input = {
  home: '/unused',
  port: 7337,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
};
const openError = new Error('database is locked');
const listenError = Object.assign(new Error('listen EADDRINUSE'), {
  code: 'EADDRINUSE',
});
const closeError = new Error('close failed');
// Done and error events of invoked actors are not in the machine's event type, but the model drives them.
const payloads: Record<string, AnyEventObject> = {
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
  'xstate.done.actor.startHttpServer': () =>
    settle(() => latest(startHttpServerCalls).resolve(mockHttpServer)),
  'xstate.error.actor.startHttpServer': () =>
    settle(() => latest(startHttpServerCalls).reject(listenError)),
  'xstate.done.actor.closeHttpServer': () =>
    settle(() => latest(closeHttpServerCalls).resolve()),
  'xstate.error.actor.closeHttpServer': () =>
    settle(() => latest(closeHttpServerCalls).reject(closeError)),
  'xstate.after.heartbeatInterval.engine.serving.running': () => {
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
  'serving.listening': (snapshot) => {
    expectModelState(snapshot);
    expect(startHttpServerCalls).toEqual([
      expect.objectContaining({
        input: {
          home: input.home,
          port: 7337,
          version: '1.2.3',
          startedAt: input.startedAt,
          database: mockDatabase,
        },
      }),
    ]);
    expect(messages).toEqual([]);
  },
  'serving.running': (snapshot) => {
    expectModelState(snapshot);
    expect(messages[0]).toEqual({ type: 'ready', port: 7337 });
    expect(messages.slice(1)).toEqual(
      messages.slice(1).map(() => ({ type: 'heartbeat' })),
    );
    expect(databaseCloses).toBe(0);
  },
  stopping: (snapshot) => {
    expectModelState(snapshot);
    expect(closeHttpServerCalls).toEqual([
      expect.objectContaining({ input: { server: snapshot.context.server } }),
    ]);
    expect(databaseCloses).toBe(0);
    // No heartbeat while closing, even if the Supervisor waits.
    const sent = messages.length;
    vi.advanceTimersByTime(heartbeatIntervalMs * 5);
    expect(messages).toHaveLength(sent);
  },
  stopped: (snapshot) => expectExit(snapshot, 0),
  failed: (snapshot) => expectExit(snapshot, 1),
};

const shortestPaths = model.getShortestPaths();
const simplePaths = model.getSimplePaths();
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
  startHttpServerCalls = [];
  closeHttpServerCalls = [];
  messages = [];
  databaseCloses = 0;
});

afterEach(() => {
  engine.stop();
  vi.useRealTimers();
});

describe('engine model', () => {
  describe.each([
    ['shortest path', shortestPaths],
    ['simple path', simplePaths],
  ])('%s', (_, paths) => {
    it.each(paths.map((path) => [title(path), path] as const))(
      '%s',
      async (_, path) => {
        await path.test({ events: executors, states });
      },
    );
  });

  it('the generated paths walk every transition', () => {
    const key = (from: EngineSnapshot, type: string, to: EngineSnapshot) =>
      `${JSON.stringify(from.value)} ${type} ${JSON.stringify(to.value)}`;
    const transitions = adjacencyMapToArray(
      getAdjacencyMap(machine, model.options),
    ).map(({ state, event, nextState }) => key(state, event.type, nextState));
    const walked = new Set(
      [...shortestPaths, ...simplePaths].flatMap((path) =>
        path.steps
          .slice(1)
          .map((step, index) =>
            key(
              path.steps[index]?.state ?? expect.unreachable(),
              step.event.type,
              step.state,
            ),
          ),
      ),
    );
    expect(transitions.length).toBeGreaterThan(0);
    expect(transitions.filter((transition) => !walked.has(transition))).toEqual(
      [],
    );
  });
});
