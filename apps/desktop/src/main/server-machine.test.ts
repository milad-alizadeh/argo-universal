import type { ServerAddress } from '@repo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type ActorLogic,
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
import {
  type CheckRunningInput,
  type ServerInput,
  serverConnectionMachine,
} from './server-machine';

// Spec 0002 section 10 numbers, written out so the model cannot grade itself.
const pollDelayMs = 200;
const startLimitMs = 30_000;
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
const exitReason = 'The Server exited while starting (1)';

interface PendingCall<TInput, TOutput> {
  input: TInput;
  resolve: (output: TOutput) => void;
  reject: (error: unknown) => void;
}

interface SpawnCall {
  sendBack: (event: AnyEventObject) => void;
  live: boolean;
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
let checkRunningCalls: PendingCall<CheckRunningInput, boolean>[];
let spawnCalls: SpawnCall[];
let signalledPids: (number | null)[];
let readyAddresses: ServerAddress[];
let server: Actor<typeof machine>;

const machine = serverConnectionMachine.provide({
  actors: {
    readAddress: createPromiseMock(() => readAddressCalls),
    checkRunning: createPromiseMock(() => checkRunningCalls),
    spawnServer: fromCallback(({ sendBack }) => {
      const call = { sendBack, live: true };
      spawnCalls.push(call);
      return () => {
        call.live = false;
      };
    }),
  },
  actions: {
    signalSupervisor: ({ context }) => {
      signalledPids.push(context.ownedPid);
    },
    log: () => {},
  },
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
  checkRunningCalls = [];
  spawnCalls = [];
  signalledPids = [];
  readyAddresses = [];
});

afterEach(() => {
  server?.stop();
  vi.useRealTimers();
});

describe('server connection model', () => {
  const readError = new Error('EACCES');
  // Done and error events of invoked actors are not in the machine's event type, but the model drives them.
  const payloads: Record<string, AnyEventObject[]> = {
    'xstate.done.actor.readAddress': [runningAddress, null, startedAddress].map(
      (output) => ({
        type: 'xstate.done.actor.readAddress',
        output,
        actorId: 'readAddress',
      }),
    ),
    'xstate.error.actor.readAddress': [
      {
        type: 'xstate.error.actor.readAddress',
        error: readError,
        actorId: 'readAddress',
      },
    ],
    'xstate.done.actor.checkRunning': [true, false].map((output) => ({
      type: 'xstate.done.actor.checkRunning',
      output,
      actorId: 'checkRunning',
    })),
    'server.spawned': [{ type: 'server.spawned', pid: startedAddress.pid }],
    'server.exited': [{ type: 'server.exited', reason: exitReason }],
  };
  const eventTypes = (node: DirectedGraphNode): string[] => [
    ...node.edges.map((edge) => edge.label.text),
    ...node.children.flatMap(eventTypes),
  ];
  const types = [...new Set(eventTypes(toDirectedGraph(machine)))];
  const events = types.flatMap(
    (type) => (payloads[type] ?? [{ type }]) as ServerEvent[],
  );

  // Never the address itself, only whose it is.
  const vertex = (snapshot: ServerSnapshot) => ({
    value: snapshot.value,
    address: snapshot.context.address?.pid ?? null,
    ownedPid: snapshot.context.ownedPid,
    failure: snapshot.context.failure !== null,
  });
  const model = new TestModel(modelLogic, {
    input,
    events,
    // A done actor ignores events, but traversal still leaves a final state through the root `on`.
    filterEvents: (snapshot, event) =>
      snapshot.status === 'active' && snapshot.can(event),
    // `via` gives each step into a state its own vertex, so the shortest paths walk every transition.
    serializeState: (snapshot, event, previous) =>
      JSON.stringify({
        ...vertex(snapshot),
        via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
      }),
    stateMatcher: (snapshot, key) => snapshot.matches(key as never),
  });
  // Without `via`: with it, the polling loops give about 9700 simple paths.
  const simplePathModel = new TestModel(modelLogic, {
    ...model.options,
    serializeState: (snapshot) => JSON.stringify(vertex(snapshot)),
  });

  const output = (event: ServerEvent) =>
    (event as unknown as { output: unknown }).output;
  // Each sends its delayed event itself: the poll delay and the limits run at once, so crossing one could fire another. The example tests below time them.
  const executors: Record<
    string,
    EventExecutor<ServerSnapshot, ServerEvent>
  > = {
    'xstate.init': () => {
      startServerMachine();
    },
    'xstate.done.actor.readAddress': ({ event }) =>
      settle(() =>
        latest(readAddressCalls).resolve(output(event) as ServerAddress | null),
      ),
    'xstate.error.actor.readAddress': () =>
      settle(() => latest(readAddressCalls).reject(readError)),
    'xstate.done.actor.checkRunning': ({ event }) =>
      settle(() => latest(checkRunningCalls).resolve(output(event) as boolean)),
    'server.spawned': () =>
      latest(spawnCalls).sendBack({
        type: 'server.spawned',
        pid: startedAddress.pid,
      }),
    'server.exited': () =>
      latest(spawnCalls).sendBack({
        type: 'server.exited',
        reason: exitReason,
      }),
    'server.retry': () => server.send({ type: 'server.retry' }),
    'app.quit': () => server.send({ type: 'app.quit' }),
    ...Object.fromEntries(
      types
        .filter((type) => type.startsWith('xstate.after.'))
        .map((type) => [type, () => server.send({ type } as never)]),
    ),
  };

  const states: Record<string, (snapshot: ServerSnapshot) => void> = {
    '*': (snapshot) => {
      const actual = server.getSnapshot();
      expect(actual.value).toEqual(snapshot.value);
      expect(actual.status).toBe(snapshot.status);
      expect(actual.context.address).toEqual(snapshot.context.address);
      expect(actual.context.ownedPid).toBe(snapshot.context.ownedPid);
      expect(actual.context.failure === null).toBe(
        snapshot.context.failure === null,
      );
      // A Supervisor that this app did not start is never signalled.
      expect(signalledPids).not.toContain(runningAddress.pid);
      // Only `starting` listens to the Supervisor it spawned.
      expect(spawnCalls.filter((call) => call.live)).toHaveLength(
        snapshot.matches('starting') ? 1 : 0,
      );
    },
    ready: (snapshot) => {
      // `ready` hands its address to the main process once.
      expect(readyAddresses).toEqual([snapshot.context.address]);
    },
    failed: (snapshot) => {
      expect(snapshot.context.failure).not.toBeNull();
      expect(readyAddresses).toEqual([]);
    },
    abandoning: () => {
      expect(latest(signalledPids)).toBe(startedAddress.pid);
    },
    stopping: () => {
      expect(latest(signalledPids)).toBe(startedAddress.pid);
    },
    stopped: () => {
      expect(server.getSnapshot().status).toBe('done');
    },
  };

  const shortestPaths = model.getShortestPaths();
  const simplePaths = simplePathModel.getSimplePaths();
  const title = (path: TestPath<ServerSnapshot, ServerEvent>) =>
    path.steps
      .map(({ event }) => {
        const name = event.type
          .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
          .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1');
        if (!('output' in event)) return name;
        const value = output(event);
        if (typeof value === 'boolean')
          return `${name} (${value ? 'running' : 'exited'})`;
        return `${name} (${value === null ? 'none' : `pid ${(value as ServerAddress).pid}`})`;
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

// The real timers, which the model sends as events.
describe('server connection', () => {
  const value = () => server.getSnapshot().value;

  const spawnSupervisor = async () => {
    startServerMachine();
    await settle(() => latest(readAddressCalls).resolve(null));
    latest(spawnCalls).sendBack({
      type: 'server.spawned',
      pid: startedAddress.pid,
    });
  };

  const startSupervisor = async () => {
    await spawnSupervisor();
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle(() => latest(readAddressCalls).resolve(startedAddress));
    expect(value()).toBe('ready');
  };

  it('reads server.json every 200 ms until it names the spawned Supervisor', async () => {
    await spawnSupervisor();
    expect(readAddressCalls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(pollDelayMs - 1);
    expect(readAddressCalls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(readAddressCalls).toHaveLength(2);
    // server.json still names an older Supervisor.
    await settle(() => latest(readAddressCalls).resolve(runningAddress));
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    expect(readAddressCalls).toHaveLength(3);
    await settle(() => latest(readAddressCalls).resolve(startedAddress));

    expect(value()).toBe('ready');
    expect(readyAddresses).toEqual([startedAddress]);
  });

  it('abandons a Supervisor that does not answer in 30 seconds', async () => {
    await spawnSupervisor();

    await vi.advanceTimersByTimeAsync(startLimitMs - 1);
    expect(value()).toEqual({ starting: 'checking' });
    await vi.advanceTimersByTimeAsync(1);

    expect(value()).toEqual({ abandoning: 'waiting' });
    expect(signalledPids).toEqual([startedAddress.pid]);
  });

  it('fails when no Supervisor spawns in 30 seconds', async () => {
    startServerMachine();
    await settle(() => latest(readAddressCalls).resolve(null));

    await vi.advanceTimersByTimeAsync(startLimitMs);

    expect(value()).toBe('failed');
    expect(signalledPids).toEqual([]);
  });

  it('gives up abandoning after 5 seconds, and keeps the pid to stop on quit', async () => {
    await spawnSupervisor();
    latest(spawnCalls).sendBack({ type: 'server.exited', reason: exitReason });

    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle(() => latest(checkRunningCalls).resolve(true));
    await vi.advanceTimersByTimeAsync(stopLimitMs - pollDelayMs - 1);
    expect(value()).toEqual({ abandoning: 'checking' });
    await vi.advanceTimersByTimeAsync(1);

    expect(value()).toBe('failed');
    expect(server.getSnapshot().context.ownedPid).toBe(startedAddress.pid);
    server.send({ type: 'app.quit' });
    expect(value()).toEqual({ stopping: 'waiting' });
  });

  it('waits 5 seconds at most for the Supervisor it started to stop on quit', async () => {
    await startSupervisor();
    server.send({ type: 'app.quit' });
    expect(signalledPids).toEqual([startedAddress.pid]);

    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle(() => latest(checkRunningCalls).resolve(true));
    await vi.advanceTimersByTimeAsync(stopLimitMs - pollDelayMs - 1);
    expect(value()).toEqual({ stopping: 'checking' });
    await vi.advanceTimersByTimeAsync(1);

    expect(server.getSnapshot().status).toBe('done');
  });

  it('quits as soon as the Supervisor it started exits', async () => {
    await startSupervisor();
    server.send({ type: 'app.quit' });

    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle(() => latest(checkRunningCalls).resolve(false));

    expect(server.getSnapshot().status).toBe('done');
    expect(server.getSnapshot().context.ownedPid).toBeNull();
  });
});
