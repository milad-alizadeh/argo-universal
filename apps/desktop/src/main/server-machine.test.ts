import type { ServerAddress } from '@repo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type ActorLogic,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
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
import {
  type ServerInput,
  type StartInput,
  type StopInput,
  serverConnectionMachine,
} from './server-machine';

// Spec 0002 section 10: a Supervisor this app started gets 5 seconds to stop on quit.
const stopLimitMs = 5000;

const runningAddress: ServerAddress = {
  pid: 100,
  port: 7337,
  version: '1.0.0',
  startedAt: '2026-10-03T09:00:00.000Z',
};
const startedAddress: ServerAddress = {
  pid: 200,
  port: 7338,
  version: '1.0.0',
  startedAt: '2026-10-03T10:00:00.000Z',
};

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

let readAddressCalls: PendingCall<ServerInput, ServerAddress | null>[];
let startCalls: PendingCall<StartInput, ServerAddress>[];
let stopCalls: PendingCall<StopInput, void>[];
let readyAddresses: ServerAddress[];
let server: Actor<typeof machine>;

const machine = serverConnectionMachine.provide({
  actors: {
    readAddress: createPromiseMock(() => readAddressCalls),
    start: createPromiseMock(() => startCalls),
    stop: createPromiseMock(() => stopCalls),
  },
  actions: { log: () => {} },
});
type ServerSnapshot = SnapshotFrom<typeof machine>;
type ServerEvent = EventFromLogic<typeof machine>;
// xstate/graph types its logic without emitted events.
const modelLogic = machine as unknown as ActorLogic<
  ServerSnapshot,
  ServerEvent,
  ServerInput
>;

const input: ServerInput = { home: '/unused', serverDirectory: '/unused' };

const startServerMachine = () => {
  server = createActor(machine, { input });
  server.on('server.ready', ({ address }) => {
    readyAddresses.push(address);
  });
  server.start();
  return server;
};

const latest = <TCall>(calls: TCall[]) =>
  calls.at(-1) ?? expect.unreachable('The actor was not invoked');

// Settles a mock promise, then lets the machine take its done or error event.
const settle = async (settleCall: () => void) => {
  settleCall();
  await vi.advanceTimersByTimeAsync(0);
};

beforeEach(() => {
  vi.useFakeTimers();
  readAddressCalls = [];
  startCalls = [];
  stopCalls = [];
  readyAddresses = [];
});

afterEach(() => {
  server?.stop();
  vi.useRealTimers();
});

describe('server model', () => {
  const readError = new Error('EACCES');
  const startError = new Error('The Server exited while starting');
  const stopError = new Error('The Server (pid 200) did not stop');
  // Done and error events of invoked actors are not in the machine's event type, but the model drives them.
  const payloads: Record<string, AnyEventObject[]> = {
    'xstate.done.actor.readAddress': [
      {
        type: 'xstate.done.actor.readAddress',
        output: runningAddress,
        actorId: 'readAddress',
      },
      {
        type: 'xstate.done.actor.readAddress',
        output: null,
        actorId: 'readAddress',
      },
    ],
    'xstate.error.actor.readAddress': [
      {
        type: 'xstate.error.actor.readAddress',
        error: readError,
        actorId: 'readAddress',
      },
    ],
    'xstate.done.actor.start': [
      {
        type: 'xstate.done.actor.start',
        output: startedAddress,
        actorId: 'start',
      },
    ],
    'xstate.error.actor.start': [
      { type: 'xstate.error.actor.start', error: startError, actorId: 'start' },
    ],
    'xstate.error.actor.stop': [
      { type: 'xstate.error.actor.stop', error: stopError, actorId: 'stop' },
    ],
    'server.spawned': [{ type: 'server.spawned', pid: startedAddress.pid }],
  };
  const eventTypes = (node: DirectedGraphNode): string[] => [
    ...node.edges.map((edge) => edge.label.text),
    ...node.children.flatMap(eventTypes),
  ];
  const events = [...new Set(eventTypes(toDirectedGraph(machine)))].flatMap(
    (type) => (payloads[type] ?? [{ type }]) as ServerEvent[],
  );

  const model = new TestModel(modelLogic, {
    input,
    events,
    // A done actor ignores events, but traversal still leaves a final state through the root `on`.
    filterEvents: (snapshot, event) =>
      snapshot.status === 'active' && snapshot.can(event),
    // Never the address itself; `via` gives a step back to a state its own vertex.
    serializeState: (snapshot, event, previous) =>
      JSON.stringify({
        value: snapshot.value,
        address: snapshot.context.address?.pid ?? null,
        ownedPid: snapshot.context.ownedPid,
        failure: snapshot.context.failure !== null,
        via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
      }),
    stateMatcher: (snapshot, key) => snapshot.matches(key as never),
  });

  const executors: Record<
    string,
    EventExecutor<ServerSnapshot, ServerEvent>
  > = {
    'xstate.init': () => {
      startServerMachine();
    },
    'xstate.done.actor.readAddress': ({ event }) =>
      settle(() =>
        latest(readAddressCalls).resolve(
          (event as unknown as { output: ServerAddress | null }).output,
        ),
      ),
    'xstate.error.actor.readAddress': () =>
      settle(() => latest(readAddressCalls).reject(readError)),
    // The real `start` reports the pid it spawned to the parent in its input.
    'server.spawned': () =>
      latest(startCalls).input.parent.send({
        type: 'server.spawned',
        pid: startedAddress.pid,
      }),
    'xstate.done.actor.start': () =>
      settle(() => latest(startCalls).resolve(startedAddress)),
    'xstate.error.actor.start': () =>
      settle(() => latest(startCalls).reject(startError)),
    'xstate.done.actor.stop': () => settle(() => latest(stopCalls).resolve()),
    'xstate.error.actor.stop': () =>
      settle(() => latest(stopCalls).reject(stopError)),
    'xstate.after.stopLimit.serverConnection.stopping': () => {
      vi.advanceTimersByTime(stopLimitMs - 1);
      expect(server.getSnapshot().value).toBe('stopping');
      vi.advanceTimersByTime(1);
    },
    'server.retry': () => server.send({ type: 'server.retry' }),
    'app.quit': () => server.send({ type: 'app.quit' }),
  };

  const expectModelState = (expected: ServerSnapshot) => {
    const actual = server.getSnapshot();
    expect(actual.value).toEqual(expected.value);
    expect(actual.status).toBe(expected.status);
    expect(actual.context.address).toEqual(expected.context.address);
    expect(actual.context.ownedPid).toBe(expected.context.ownedPid);
    expect(actual.context.failure === null).toBe(
      expected.context.failure === null,
    );
    // A Supervisor that this app did not start is never stopped.
    expect(stopCalls.map((call) => call.input.pid)).not.toContain(
      runningAddress.pid,
    );
  };
  const states: Record<string, (snapshot: ServerSnapshot) => void> = {
    locating: (snapshot) => {
      expectModelState(snapshot);
      expect(readAddressCalls.length).toBeGreaterThan(0);
    },
    starting: (snapshot) => {
      expectModelState(snapshot);
      expect(latest(startCalls).input).toEqual(expect.objectContaining(input));
    },
    abandoning: (snapshot) => {
      expectModelState(snapshot);
      expect(latest(stopCalls).input).toEqual({ pid: startedAddress.pid });
    },
    ready: (snapshot) => {
      expectModelState(snapshot);
      // `ready` hands its address to the main process once.
      expect(readyAddresses).toEqual([snapshot.context.address]);
    },
    failed: (snapshot) => {
      expectModelState(snapshot);
      expect(snapshot.context.failure).not.toBeNull();
      expect(readyAddresses).toEqual([]);
    },
    stopping: (snapshot) => {
      expectModelState(snapshot);
      expect(latest(stopCalls).input).toEqual({ pid: startedAddress.pid });
    },
    stopped: (snapshot) => {
      expectModelState(snapshot);
      expect(server.getSnapshot().status).toBe('done');
    },
  };

  const shortestPaths = model.getShortestPaths();
  const simplePaths = model.getSimplePaths();
  const title = (path: TestPath<ServerSnapshot, ServerEvent>) =>
    path.steps
      .map(({ event }) => {
        const name = event.type
          .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
          .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1');
        return 'output' in event && event.output === null
          ? `${name} (none)`
          : name;
      })
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
    const key = (from: ServerSnapshot, type: string, to: ServerSnapshot) =>
      `${JSON.stringify(from.value)} ${type} ${JSON.stringify(to.value)}`;
    const transitions = adjacencyMapToArray(
      getAdjacencyMap(modelLogic, model.options),
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
