import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import type { QueryClient } from '@tanstack/react-query';
import type { TRPCWebSocketClient } from '@trpc/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type ActorLogic,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromCallback,
  type SnapshotFrom,
} from 'xstate';
import {
  type DirectedGraphNode,
  type EventExecutor,
  TestModel,
  type TestPath,
  toDirectedGraph,
} from 'xstate/graph';
import { type ConnectionInput, connectionMachine } from './machine';

const connectionLostEvent = 'connection.lost';
const connectionAttemptEvent = 'connection.attemptRequested';

// Numbers written out so the model cannot grade itself.
const offlineDelayMs = 10_000;
const retryDelayMs = (attempts: number) =>
  Math.min(500 * 2 ** attempts, 30_000);

const lostError = new Error('WebSocket closed');

let watcher: { send: (event: AnyEventObject) => void; live: boolean };
let refetches: number;
let allowedAttempts: number;
let connection: Actor<typeof machine>;

const machine = connectionMachine.provide({
  actors: {
    watchConnectionState: fromCallback(({ sendBack }) => {
      const watching = { send: sendBack, live: true };
      watcher = watching;
      return () => {
        watching.live = false;
      };
    }),
  },
  actions: {
    refetchAfterReconnect: () => {
      refetches += 1;
    },
  },
});
type ConnectionSnapshot = SnapshotFrom<typeof machine>;
type ConnectionEvent = EventFromLogic<typeof machine>;
// xstate/graph types its logic without emitted events.
const modelLogic = machine as unknown as ActorLogic<
  ConnectionSnapshot,
  ConnectionEvent,
  ConnectionInput
>;

// The machine reads neither while the watcher and refetch are mocks.
const input: ConnectionInput = {
  webSocketClient: {} as TRPCWebSocketClient,
  queryClient: {} as QueryClient,
};

const startConnection = () => {
  connection = createActor(machine, { input });
  connection.on('connection.attemptAllowed', () => {
    allowedAttempts += 1;
  });
  connection.start();
  return connection;
};

const linkState = (snapshot: ConnectionSnapshot) => snapshot.value.link;
const attemptState = (snapshot: ConnectionSnapshot) => snapshot.value.attempt;
const isDown = (snapshot: ConnectionSnapshot) =>
  ['reconnecting', 'offline'].includes(linkState(snapshot));

beforeEach(() => {
  vi.useFakeTimers();
  refetches = 0;
  allowedAttempts = 0;
});

afterEach(() => {
  connection?.stop();
  vi.useRealTimers();
});

describe('connection model', () => {
  const payloads: Record<string, ConnectionEvent> = {
    'connection.lost': { type: connectionLostEvent, error: lostError },
  };
  const eventTypes = (node: DirectedGraphNode): string[] => [
    ...node.edges.map((edge) => edge.label.text),
    ...node.children.flatMap(eventTypes),
  ];
  const events = [...new Set(eventTypes(toDirectedGraph(machine)))].map(
    (type) => payloads[type] ?? ({ type } as ConnectionEvent),
  );

  const model = new TestModel(modelLogic, {
    input,
    events,
    filterEvents: (snapshot, event) => snapshot.can(event),
    // Only the first attempt is special, so more attempts make no new vertex; `retriedFrom` lets a retry return to a state that a path already passed.
    serializeState: (snapshot, event, previous) =>
      JSON.stringify({
        value: snapshot.value,
        attempted: snapshot.context.attempts > 0,
        retriedFrom: event?.type.startsWith('xstate.after.retryDelay.')
          ? previous?.value
          : undefined,
      }),
    stateMatcher: (snapshot, key) => snapshot.matches(key as never),
  });

  // Each sends the delayed event itself: the retry and offline timers run at once, so crossing one could fire the other. The example tests below time them.
  const executors: Record<
    string,
    EventExecutor<ConnectionSnapshot, ConnectionEvent>
  > = {
    'xstate.init': () => {
      startConnection();
    },
    'connection.opened': () => {
      const before = { refetches, down: isDown(connection.getSnapshot()) };
      watcher.send({ type: 'connection.opened' });
      expect(refetches).toBe(before.refetches + (before.down ? 1 : 0));
    },
    'connection.lost': () => {
      watcher.send({ type: connectionLostEvent, error: lostError });
    },
    'connection.attemptRequested': (step) => {
      const before = allowedAttempts;
      connection.send({ type: connectionAttemptEvent });
      // An attempt allowed at once leaves nothing waiting.
      expect(allowedAttempts).toBe(
        before + (attemptState(step.state) === 'idle' ? 1 : 0),
      );
    },
    'app.foreground': () => {
      const before = allowedAttempts;
      connection.send({ type: 'app.foreground' });
      expect(allowedAttempts).toBe(before + 1);
    },
    'xstate.after.retryDelay.connection.attempt.waiting': (step) => {
      const before = allowedAttempts;
      connection.send({ type: step.event.type } as never);
      expect(allowedAttempts).toBe(before + 1);
    },
    'xstate.after.offlineDelay.connection.link.reconnecting': (step) => {
      connection.send({ type: step.event.type } as never);
    },
  };

  const states: Record<string, (snapshot: ConnectionSnapshot) => void> = {
    '*': (snapshot) => {
      const actual = connection.getSnapshot();
      expect(actual.value).toEqual(snapshot.value);
      expect(actual.context.attempts > 0).toBe(snapshot.context.attempts > 0);
      expect(watcher.live).toBe(true);
    },
  };

  const shortestPaths = [
    ...model.getShortestPaths(),
    ...model.getPathsFromEvents([
      { type: connectionAttemptEvent },
      { type: connectionAttemptEvent },
      { type: connectionLostEvent, error: lostError },
    ]),
  ];
  // Direct paths cover first-connect losses; simple paths cover later reconnect cycles.
  const simplePaths = model.getSimplePaths({
    filterEvents: (snapshot, event) =>
      snapshot.can(event) &&
      !(
        linkState(snapshot) === 'connecting' &&
        event.type === connectionLostEvent
      ),
  });
  const title = (path: TestPath<ConnectionSnapshot, ConnectionEvent>) =>
    path.steps
      .map(({ event }) =>
        event.type.replace(/^xstate\.after\.(\w+)\..*$/, 'after $1'),
      )
      .join(' → ');

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
    expect(
      unwalkedTransitions({
        models: [model],
        paths: [...shortestPaths, ...simplePaths],
        stateKey: (snapshot) => JSON.stringify(snapshot.value),
        eventKey: (event) => event.type,
      }),
    ).toEqual([]);
  });
});

// The real timers, which the model sends as events.
describe('connection', () => {
  const requestAttempt = () =>
    connection.send({ type: connectionAttemptEvent });

  // Requests an attempt and returns how long the machine waited before it allowed it.
  const waitForAllowedAttempt = () => {
    const before = allowedAttempts;
    requestAttempt();
    let waited = 0;
    while (allowedAttempts === before) {
      if (waited >= 60_000) throw new Error('The attempt was never allowed');
      vi.advanceTimersByTime(100);
      waited += 100;
    }
    return waited;
  };

  const loseOpenConnection = () => {
    watcher.send({ type: 'connection.opened' });
    watcher.send({ type: connectionLostEvent, error: lostError });
  };

  it('allows the first attempt at once', () => {
    startConnection();

    expect(waitForAllowedAttempt()).toBe(0);
  });

  it('waits before a second attempt while still connecting', () => {
    startConnection();
    waitForAllowedAttempt();

    expect(waitForAllowedAttempt()).toBe(retryDelayMs(1));
  });

  it('doubles the retry delay from 0.5 seconds to a 30-second cap', () => {
    startConnection();
    loseOpenConnection();

    const waits = Array.from({ length: 9 }, waitForAllowedAttempt);

    expect(waits).toEqual([
      500, 1000, 2000, 4000, 8000, 16_000, 30_000, 30_000, 30_000,
    ]);
    expect(waits).toEqual(waits.map((_, attempts) => retryDelayMs(attempts)));
  });

  it('starts the retry delay over after the Connection opens', () => {
    startConnection();
    loseOpenConnection();
    for (let attempt = 0; attempt < 4; attempt++) waitForAllowedAttempt();

    loseOpenConnection();

    expect(waitForAllowedAttempt()).toBe(500);
  });

  it('a loss before the first open goes offline after offlineDelay', () => {
    startConnection();
    watcher.send({ type: connectionLostEvent, error: lostError });

    expect(linkState(connection.getSnapshot())).toBe('reconnecting');
    vi.advanceTimersByTime(offlineDelayMs - 1);
    expect(linkState(connection.getSnapshot())).toBe('reconnecting');
    vi.advanceTimersByTime(1);
    expect(linkState(connection.getSnapshot())).toBe('offline');
    expect(refetches).toBe(0);
  });

  it('goes offline 10 seconds after the Connection is lost', () => {
    startConnection();
    loseOpenConnection();

    vi.advanceTimersByTime(offlineDelayMs - 1);
    expect(linkState(connection.getSnapshot())).toBe('reconnecting');
    vi.advanceTimersByTime(1);
    expect(linkState(connection.getSnapshot())).toBe('offline');
  });

  it('keeps a waiting attempt when it goes offline', () => {
    startConnection();
    loseOpenConnection();
    for (let attempt = 0; attempt < 4; attempt++) waitForAllowedAttempt();
    // 7.5 seconds have passed; the next attempt waits 8 seconds.
    requestAttempt();

    vi.advanceTimersByTime(2500);
    expect(linkState(connection.getSnapshot())).toBe('offline');
    expect(allowedAttempts).toBe(4);
    vi.advanceTimersByTime(5500);
    expect(allowedAttempts).toBe(5);
  });

  it('allows a waiting attempt at once when the app comes to the foreground', () => {
    startConnection();
    loseOpenConnection();
    requestAttempt();

    connection.send({ type: 'app.foreground' });

    expect(allowedAttempts).toBe(1);
    vi.advanceTimersByTime(retryDelayMs(0));
    expect(allowedAttempts).toBe(1);
  });

  it('ignores another loss while it reconnects, so the offline delay keeps running', () => {
    startConnection();
    loseOpenConnection();

    vi.advanceTimersByTime(offlineDelayMs - 1);
    watcher.send({ type: connectionLostEvent, error: lostError });
    vi.advanceTimersByTime(1);

    expect(linkState(connection.getSnapshot())).toBe('offline');
  });
});
