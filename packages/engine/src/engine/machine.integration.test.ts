import { randomUUID } from 'node:crypto';
import { type Database, openDatabase } from '@repo/db';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  matchesState,
  type EventFromLogic,
  type ErrorActorEvent,
  fromCallback,
  fromPromise,
  type SnapshotFrom,
  type PromiseActorLogic,
  type EventObject,
} from 'xstate';
import {
  type DirectedGraphNode,
  type EventExecutor,
  type StatePath,
  type GraphEventFromLogic,
  type AdjacencyMap,
  getShortestPaths,
  getAdjacencyMap,
  toDirectedGraph,
} from 'xstate/graph';
import type { AcpResources } from '../acp';
import type { OpenSessionsActorRef } from '../sessions';
import type { HttpServer, HttpServerOptions } from './http-server';
import type { EngineMessage } from './ipc';
import { engineMachine } from './machine';

const stopAllSessionsEvent = 'sessions.stopAll';
const drainWriterEvent = 'writer.drain';
const stopEngineEvent = 'engine.stop';

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
): PromiseActorLogic<TOutput, TInput, EventObject> =>
  fromPromise<TOutput, TInput>(
    ({ input }): Promise<TOutput> =>
      new Promise<TOutput>((resolve, reject): void => {
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
let closeResourceCalls: PendingCall<
  { resources: AcpResources; sessions: OpenSessionsActorRef | undefined },
  void
>[];
let shutdownCommands: string[];
let logs: string[];
let processSignals: { send: (event: AnyEventObject) => void; live: boolean };
let messages: EngineMessage[];
let databaseCloses: number;
let engine: Actor<typeof machine>;

const graphDatabase = openDatabase(':memory:');
afterAll((): void => graphDatabase.$client.close());
let mockDatabase = graphDatabase;
let removeDatabase: () => void;
// The closeHttpServer mock stands in for `close()`, so the handle itself is never called.
const mockHttpServer: HttpServer = {
  createCaller: (): never =>
    expect.unreachable('Structural model does not call procedures'),
  close: (): never =>
    expect.unreachable('The machine closes through closeHttpServer'),
};

const machineWithExternalMocks = engineMachine.provide({
  actors: {
    openDatabase: createPromiseMock(
      (): PendingCall<{ home: string }, Database>[] => openDatabaseCalls,
    ),
    recoverAfterRestart: createPromiseMock(
      (): PendingCall<{ database: Database; blobsFolder: string }, void>[] =>
        recoveryCalls,
    ),
    startHttpServer: createPromiseMock(
      (): PendingCall<HttpServerOptions, HttpServer>[] => startHttpServerCalls,
    ),
    closeHttpServer: createPromiseMock(
      (): PendingCall<{ server: HttpServer | null }, void>[] =>
        closeHttpServerCalls,
    ),
    processSignals: fromCallback(({ sendBack }): (() => void) => {
      const signals = { send: sendBack, live: true };
      processSignals = signals;
      return (): void => {
        signals.live = false;
      };
    }),
  },
  actions: {
    sendToSupervisor: (_, message): void => {
      messages.push(message);
    },
    log: (_, params): void => {
      logs.push(params.line);
    },
  },
});
const machine = machineWithExternalMocks.provide({
  actors: {
    closeAcpResources: createPromiseMock(() => closeResourceCalls),
  },
  actions: {
    stopSessions: (): number => shutdownCommands.push(stopAllSessionsEvent),
    drainWriter: (): number => shutdownCommands.push(drainWriterEvent),
  },
});
type EngineSnapshot = SnapshotFrom<typeof machine>;

const input = {
  now: (): number => Date.now(),
  createId: randomUUID,
  home: '/unused',
  port: 7337,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  // No Agents, so the open Sessions machine never probes a real CLI.
  adapters: [],
};
const openError = new Error('database is locked');
const recoveryError = new Error('repair failed');
const listenError = Object.assign(new Error('listen EADDRINUSE'), {
  code: 'EADDRINUSE',
});
const closeError = new Error('close failed');
// Done and error events of invoked actors are not in the machine's event type, but the model drives them.
const sessionFailure = {
  type: 'xstate.error.actor.sessions',
  actorId: 'sessions',
  error: new Error('stop failed'),
} satisfies EventFromLogic<typeof machine> & ErrorActorEvent<Error, 'sessions'>;
const writerFailure = {
  type: 'xstate.error.actor.databaseWriter',
  actorId: 'databaseWriter',
  error: new Error('drain failed'),
} satisfies EventFromLogic<typeof machine> &
  ErrorActorEvent<Error, 'databaseWriter'>;
const fixtures = [
  {
    type: 'xstate.done.actor.openDatabase',
    actorId: 'openDatabase',
    output: mockDatabase,
  },
  {
    type: 'xstate.error.actor.openDatabase',
    actorId: 'openDatabase',
    error: openError,
  },
  {
    type: 'xstate.done.actor.recoverAfterRestart',
    actorId: 'recoverAfterRestart',
    output: undefined,
  },
  {
    type: 'xstate.error.actor.recoverAfterRestart',
    actorId: 'recoverAfterRestart',
    error: recoveryError,
  },
  {
    type: 'xstate.done.actor.startHttpServer',
    actorId: 'startHttpServer',
    output: mockHttpServer,
  },
  {
    type: 'xstate.error.actor.startHttpServer',
    actorId: 'startHttpServer',
    error: listenError,
  },
  {
    type: 'xstate.done.actor.closeHttpServer',
    actorId: 'closeHttpServer',
    output: undefined,
  },
  {
    type: 'xstate.error.actor.closeHttpServer',
    actorId: 'closeHttpServer',
    error: closeError,
  },
  { type: 'xstate.done.actor.sessions' },
  {
    type: 'xstate.done.actor.closeAcpResources',
    actorId: 'closeAcpResources',
    output: undefined,
  },
  {
    type: 'xstate.error.actor.closeAcpResources',
    actorId: 'closeAcpResources',
    error: new Error('cleanup failed'),
  },
  sessionFailure,
  { type: 'xstate.done.actor.databaseWriter' },
  writerFailure,
  { type: stopEngineEvent, reason: 'SIGTERM' },
  { type: 'xstate.after.httpCloseLimit.engine.live.stopping.closingHttp' },
  {
    type: 'xstate.after.sessionStopLimit.engine.live.stopping.stoppingSessions',
  },
  { type: 'xstate.after.writerDrainLimit.engine.live.stopping.drainingWriter' },
  { type: 'xstate.after.heartbeatInterval.engine.live.running' },
] satisfies GraphEventFromLogic<typeof machine>[];
type EngineEvent = (typeof fixtures)[number];
const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge): string => edge.label.text),
  ...node.children.flatMap(eventTypes),
];
// The machine raises `xstate.done.state.*` itself, so the model must not send it.
const events = [...new Set(eventTypes(toDirectedGraph(machine)))]
  .filter((type): boolean => !type.startsWith('xstate.done.state.'))
  .map((type): EngineEvent => {
    const fixture = fixtures.find((event) => event.type === type);
    if (!fixture) throw new Error(`Missing Engine graph fixture for ${type}`);
    return fixture;
  });

const canGraphEvent = (
  snapshot: EngineSnapshot,
  event: EngineEvent,
): boolean => {
  switch (event.type) {
    case 'xstate.done.actor.openDatabase':
    case 'xstate.error.actor.openDatabase':
      return snapshot.matches('openingDatabase');
    case 'xstate.done.actor.recoverAfterRestart':
    case 'xstate.error.actor.recoverAfterRestart':
      return snapshot.matches('recovering');
    case 'xstate.done.actor.startHttpServer':
    case 'xstate.error.actor.startHttpServer':
      return snapshot.matches({ live: 'listening' });
    case 'xstate.done.actor.closeHttpServer':
    case 'xstate.error.actor.closeHttpServer':
    case 'xstate.after.httpCloseLimit.engine.live.stopping.closingHttp':
      return snapshot.matches({ live: { stopping: 'closingHttp' } });
    case 'xstate.after.sessionStopLimit.engine.live.stopping.stoppingSessions':
      return snapshot.matches({ live: { stopping: 'stoppingSessions' } });
    case 'xstate.done.actor.closeAcpResources':
    case 'xstate.error.actor.closeAcpResources':
      return snapshot.matches({ live: { stopping: 'closingAgents' } });
    case 'xstate.after.writerDrainLimit.engine.live.stopping.drainingWriter':
      return snapshot.matches({ live: { stopping: 'drainingWriter' } });
    case 'xstate.after.heartbeatInterval.engine.live.running':
      return snapshot.matches({ live: 'running' });
    default:
      return snapshot.can(event);
  }
};

const options = {
  input,
  events,
  limit: 1000,
  // A done actor ignores events, so the model must not send any.
  filterEvents: (snapshot: EngineSnapshot, event: EngineEvent): boolean =>
    snapshot.status === 'active' && canGraphEvent(snapshot, event),
  // Never the handles themselves; `via` gives the heartbeat self-transition its own vertex.
  serializeState: (
    snapshot: EngineSnapshot,
    event: EngineEvent | undefined,
    previous?: EngineSnapshot,
  ): string =>
    JSON.stringify({
      value: snapshot.value,
      database: snapshot.context.database !== null,
      server: snapshot.context.server !== null,
      failure: snapshot.context.failure !== null,
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
};

const latest = <TCall>(calls: TCall[]): NonNullable<TCall> =>
  calls.at(-1) ?? expect.unreachable('The actor was not invoked');

// Settles a mock promise, then lets the machine take its done or error event.
const settle = async (settleCall: () => void): Promise<void> => {
  settleCall();
  await vi.advanceTimersByTimeAsync(0);
};

const executors: Record<string, EventExecutor<EngineSnapshot, EngineEvent>> = {
  'xstate.init': (): void => {
    engine = createActor(machine, { input }).start();
  },
  'xstate.done.actor.openDatabase': (): Promise<void> =>
    settle((): void => latest(openDatabaseCalls).resolve(mockDatabase)),
  'xstate.error.actor.openDatabase': (): Promise<void> =>
    settle((): void => latest(openDatabaseCalls).reject(openError)),
  'xstate.done.actor.recoverAfterRestart': (): Promise<void> =>
    settle((): void => latest(recoveryCalls).resolve()),
  'xstate.error.actor.recoverAfterRestart': (): Promise<void> =>
    settle((): void => latest(recoveryCalls).reject(recoveryError)),
  'xstate.done.actor.startHttpServer': (): Promise<void> =>
    settle((): void => latest(startHttpServerCalls).resolve(mockHttpServer)),
  'xstate.error.actor.startHttpServer': (): Promise<void> =>
    settle((): void => latest(startHttpServerCalls).reject(listenError)),
  'xstate.done.actor.closeHttpServer': (): Promise<void> =>
    settle((): void => latest(closeHttpServerCalls).resolve()),
  'xstate.error.actor.closeHttpServer': (): Promise<void> =>
    settle((): void => latest(closeHttpServerCalls).reject(closeError)),
  'xstate.done.actor.sessions': (): void =>
    engine.system.get('sessions').send({ type: stopAllSessionsEvent }),
  'xstate.error.actor.sessions': (): void => engine.send(sessionFailure),
  'xstate.done.actor.closeAcpResources': (): Promise<void> =>
    settle(() => latest(closeResourceCalls).resolve()),
  'xstate.error.actor.closeAcpResources': ({ event }): Promise<void> =>
    settle(() => {
      if ('error' in event) latest(closeResourceCalls).reject(event.error);
    }),
  'xstate.done.actor.databaseWriter': (): void =>
    engine.system.get('databaseWriter').send({ type: drainWriterEvent }),
  'xstate.error.actor.databaseWriter': (): void => engine.send(writerFailure),
  'xstate.after.httpCloseLimit.engine.live.stopping.closingHttp': (): void => {
    vi.advanceTimersByTime(5000);
  },
  'xstate.after.sessionStopLimit.engine.live.stopping.stoppingSessions':
    (): void => {
      vi.advanceTimersByTime(10000);
    },
  'xstate.after.writerDrainLimit.engine.live.stopping.drainingWriter':
    (): void => {
      vi.advanceTimersByTime(5000);
    },
  'xstate.after.heartbeatInterval.engine.live.running': (): void => {
    const sent = messages.length;
    vi.advanceTimersByTime(heartbeatIntervalMs - 1);
    expect(messages).toHaveLength(sent);
    vi.advanceTimersByTime(1);
    expect(messages).toHaveLength(sent + 1);
  },
  'engine.stop': (): void =>
    processSignals.send({ type: stopEngineEvent, reason: 'SIGTERM' }),
};

const expectModelState = (expected: EngineSnapshot): void => {
  const actual = engine.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.context.database).toBe(
    expected.context.database === null ? null : mockDatabase,
  );
  expect(actual.context.server).toBe(expected.context.server);
  expect(actual.context.failure).toBe(expected.context.failure);
};
// Final states close the database they opened, stop listening for signals, and exit with a code.
const expectExit = (snapshot: EngineSnapshot, exitCode: number): void => {
  expectModelState(snapshot);
  expect(engine.getSnapshot().output).toEqual({ exitCode });
  expect(databaseCloses).toBe(snapshot.context.database === null ? 0 : 1);
  expect(processSignals.live).toBe(false);
};
const states: Record<string, (snapshot: EngineSnapshot) => void> = {
  openingDatabase: (snapshot): void => {
    expectModelState(snapshot);
    expect(openDatabaseCalls).toEqual([
      expect.objectContaining({ input: { home: input.home } }),
    ]);
    expect(startHttpServerCalls).toEqual([]);
    expect(messages).toEqual([]);
    expect(processSignals.live).toBe(true);
  },
  recovering: (snapshot): void => {
    expectModelState(snapshot);
    expect(recoveryCalls).toEqual([
      expect.objectContaining({
        input: {
          database: mockDatabase,
          blobsFolder: '/unused/blobs',
        },
      }),
    ]);
    expect(startHttpServerCalls).toEqual([]);
    expect(messages).toEqual([]);
    expect(databaseCloses).toBe(0);
  },
  'live.listening': (snapshot): void => {
    expectModelState(snapshot);
    const sessions = startHttpServerCalls[0]?.input.sessions;
    expect(sessions?.getSnapshot().context.now).toBe(input.now);
    expect(sessions?.getSnapshot().context.createId).toBe(input.createId);
    expect(
      engine.getSnapshot().children.databaseWriter?.getSnapshot(),
    ).toMatchObject({
      context: { now: input.now },
    });
    expect(startHttpServerCalls).toEqual([
      expect.objectContaining({
        input: {
          createId: input.createId,
          home: input.home,
          port: 7337,
          version: '1.2.3',
          startedAt: input.startedAt,
          database: mockDatabase,
          sessions: expect.anything(),
          databaseWriter: expect.anything(),
          syncSupervisor: expect.anything(),
          commandAdmission: expect.any(AbortController),
        },
      }),
    ]);
    expect(messages).toEqual([]);
  },
  'live.running': (snapshot): void => {
    expectModelState(snapshot);
    expect(messages[0]).toEqual({ type: 'ready', port: 7337 });
    expect(messages.slice(1)).toEqual(
      messages.slice(1).map((): { type: string } => ({ type: 'heartbeat' })),
    );
    expect(databaseCloses).toBe(0);
  },
  'live.stopping.closingHttp': (snapshot): void => {
    expectModelState(snapshot);
    expect(closeHttpServerCalls).toEqual([
      expect.objectContaining({ input: { server: snapshot.context.server } }),
    ]);
    expect(databaseCloses).toBe(0);
    expect(shutdownCommands).toEqual([]);
    expect(engine.system.get('sessions')).toBeDefined();
    expect(engine.system.get('databaseWriter')).toBeDefined();
  },
  'live.stopping.stoppingSessions': (snapshot): void => {
    expectModelState(snapshot);
    expect(shutdownCommands).toEqual([stopAllSessionsEvent]);
    expect(databaseCloses).toBe(0);
    expect(engine.system.get('databaseWriter')).toBeDefined();
  },
  'live.stopping.drainingWriter': (snapshot): void => {
    expectModelState(snapshot);
    expect(shutdownCommands).toEqual([stopAllSessionsEvent, drainWriterEvent]);
    expect(databaseCloses).toBe(0);
  },
  'live.stopping.closingAgents': (snapshot): void => {
    expectModelState(snapshot);
    expect(databaseCloses).toBe(0);
    expect(shutdownCommands).toEqual([stopAllSessionsEvent]);
  },
  'live.stopping.retainingAgentCleanup': (snapshot): void => {
    expectModelState(snapshot);
    expect(databaseCloses).toBe(0);
    expect(shutdownCommands).toEqual([stopAllSessionsEvent]);
    expect(snapshot.context.failure).toContain('cleanup remains unresolved');
  },
  stopped: (snapshot): void => expectExit(snapshot, 0),
  failed: (snapshot): void => expectExit(snapshot, 1),
};

const paths = terminalPaths(getShortestPaths(machine, options));
const title = (path: StatePath<EngineSnapshot, EngineEvent>): string =>
  path.steps
    .map(({ event }): string =>
      event.type
        .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
        .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1'),
    )
    .join(' → ');

beforeEach((): void => {
  mockDatabase = openDatabase(':memory:');
  const close = vi
    .spyOn(mockDatabase.$client, 'close')
    .mockImplementation((): void => {
      databaseCloses += 1;
    });
  removeDatabase = (): void => {
    close.mockRestore();
    mockDatabase.$client.close();
  };
  vi.useFakeTimers();
  openDatabaseCalls = [];
  recoveryCalls = [];
  startHttpServerCalls = [];
  closeHttpServerCalls = [];
  closeResourceCalls = [];
  shutdownCommands = [];
  logs = [];
  messages = [];
  databaseCloses = 0;
});

afterEach((): void => {
  engine.stop();
  removeDatabase();
  vi.useRealTimers();
});

const startRunningEngine = async (logic = machine): Promise<void> => {
  engine = createActor(logic, { input }).start();
  await settle((): void => latest(openDatabaseCalls).resolve(mockDatabase));
  await settle((): void => latest(recoveryCalls).resolve());
  await settle((): void =>
    latest(startHttpServerCalls).resolve(mockHttpServer),
  );
};

it('finishes shutdown when the open Sessions machine and the writer complete immediately', async (): Promise<void> => {
  await startRunningEngine(machineWithExternalMocks);
  engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
  await settle((): void => latest(closeHttpServerCalls).resolve());
  expect(engine.getSnapshot().status).toBe('done');
  expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
  expect(databaseCloses).toBe(1);
  expect(logs.some((line): boolean => line.includes('limit reached'))).toBe(
    false,
  );
});

it('closes Agent resources before draining the writer when Sessions exceed their stop limit', async (): Promise<void> => {
  await startRunningEngine();
  engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
  await settle((): void => latest(closeHttpServerCalls).resolve());
  vi.advanceTimersByTime(10000);
  expect(logs).toContain('Session stop limit reached; closing Agent resources');
  engine.system.get('sessions').send({ type: stopAllSessionsEvent });
  await settle(() => latest(closeResourceCalls).resolve());
  expect(
    engine.getSnapshot().matches({ live: { stopping: 'drainingWriter' } }),
  ).toBe(true);
  expect(databaseCloses).toBe(0);
  expect(shutdownCommands).toEqual([stopAllSessionsEvent, drainWriterEvent]);
  engine.system.get('databaseWriter').send({ type: drainWriterEvent });
  expect(engine.getSnapshot().status).toBe('done');
  expect(databaseCloses).toBe(1);
});

describe('engine model', (): void => {
  it.each(
    paths.map(
      (path): [string, StatePath<EngineSnapshot, EngineEvent>] =>
        [title(path), path] as const,
    ),
  )('%s', async (_, path): Promise<void> => {
    for (const step of path.steps) {
      const execute = executors[step.event.type];
      if (!execute)
        throw new Error(`Missing Engine executor for ${step.event.type}`);
      await execute(step);
      for (const [key, assertState] of Object.entries(states)) {
        if (matchesState(key, step.state.value)) assertState(step.state);
      }
    }
  });

  it('the generated paths walk every transition', (): void => {
    expect(
      unwalkedTransitions({
        models: [
          {
            getAdjacencyMap: (): AdjacencyMap<EngineSnapshot, EngineEvent> =>
              getAdjacencyMap(machine, options),
          },
        ],
        paths,
        stateKey: (snapshot): string => JSON.stringify(snapshot.value),
        eventKey: (event): typeof event.type => event.type,
      }),
    ).toEqual([]);
  });
});
