import type { ServerAddress } from '@repo/contracts';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
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
  type DirectedGraphNode,
  type EventExecutor,
  TestModel,
  type TestPath,
  toDirectedGraph,
} from 'xstate/graph';
import {
  type CheckRunningInput,
  type ServerInput,
  type SpawnInput,
  serverConnectionMachine,
} from './server-machine';

// Numbers written out so the model cannot grade itself.
const pollDelayMs = 200;
const startLimitMs = 30_000;
const stopLimitMs = 5000;

const spawnedAt = Date.parse('2026-10-03T09:30:00.000Z');
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
// A server.json from before the spawn whose pid the OS gave to the new Supervisor.
const staleAddress: ServerAddress = {
  ...startedAddress,
  port: 7339,
  startedAt: '2026-10-03T08:00:00.000Z',
};
const exitReason = 'The Supervisor exited while starting (1)';

interface PendingCall<TInput, TOutput> {
  input: TInput;
  resolve: (output: TOutput) => void;
  reject: (error: unknown) => void;
}

interface SpawnCall {
  input: SpawnInput;
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
let failures: (string | null)[];
let server: Actor<typeof machine>;

const machine = serverConnectionMachine.provide({
  actors: {
    readAddress: createPromiseMock(() => readAddressCalls),
    checkRunning: createPromiseMock(() => checkRunningCalls),
    spawnSupervisor: fromCallback<AnyEventObject, SpawnInput>(({ input }) => {
      const call = { input, live: true };
      spawnCalls.push(call);
      return () => {
        call.live = false;
      };
    }),
  },
  actions: {
    signalOwnedSupervisor: ({ context }) => {
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
  server.on('server.failed', ({ failure }) => {
    failures.push(failure);
  });
  server.start();
  return server;
};

const latest = <TCall>(calls: TCall[]) =>
  calls.at(-1) ?? expect.unreachable('The actor was not invoked');

// What the real `spawnSupervisor` sends to the machine it was given.
const reportSpawned = () =>
  latest(spawnCalls).input.parent.send({
    type: 'server.spawned',
    pid: startedAddress.pid,
    at: spawnedAt,
  });
const reportExited = () =>
  latest(spawnCalls).input.parent.send({
    type: 'server.exited',
    reason: exitReason,
  });

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
  failures = [];
});

afterEach(() => {
  server?.stop();
  vi.useRealTimers();
});

describe('server connection model', () => {
  const readError = new Error('EACCES');
  // Done and error events of invoked actors are not in the machine's event type, but the model drives them.
  const payloads: Record<string, AnyEventObject[]> = {
    'xstate.done.actor.readAddress': [
      runningAddress,
      null,
      startedAddress,
      staleAddress,
    ].map((output) => ({
      type: 'xstate.done.actor.readAddress',
      output,
      actorId: 'readAddress',
    })),
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
    'server.spawned': [
      { type: 'server.spawned', pid: startedAddress.pid, at: spawnedAt },
    ],
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
  const output = (event: ServerEvent) =>
    (event as unknown as { output: unknown }).output;

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
    // A done actor ignores events, but traversal still leaves a final state through the root `on`; a stale server.json only matters while the spawned Supervisor answers.
    filterEvents: (snapshot, event) =>
      snapshot.status === 'active' &&
      snapshot.can(event) &&
      (output(event) !== staleAddress ||
        snapshot.matches({ starting: { answering: 'checking' } })),
    // `via` gives each step into a state its own vertex, so the shortest paths walk every transition.
    serializeState: (snapshot, event, previous) =>
      JSON.stringify({
        ...vertex(snapshot),
        via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
      }),
    stateMatcher: (snapshot, key) => snapshot.matches(key as never),
  });
  // Without `via`: with it, the polling loops give thousands of simple paths.
  const simplePathModel = new TestModel(modelLogic, {
    ...model.options,
    serializeState: (snapshot) => JSON.stringify(vertex(snapshot)),
  });

  // Fires timers in order until the delayed transition has run; an earlier `pollDelay` may fire on the way.
  const fireDelay: EventExecutor<ServerSnapshot, ServerEvent> = async ({
    state,
  }) => {
    for (let timers = 0; timers < 5; timers++) {
      await vi.advanceTimersToNextTimerAsync();
      const actual = server.getSnapshot().value;
      if (JSON.stringify(actual) === JSON.stringify(state.value)) return;
    }
    expect.unreachable(`${JSON.stringify(state.value)} was never reached`);
  };

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
    'server.spawned': reportSpawned,
    'server.exited': reportExited,
    'server.retry': () => server.send({ type: 'server.retry' }),
    'app.quit': () => server.send({ type: 'app.quit' }),
    ...Object.fromEntries(
      types
        .filter((type) => type.startsWith('xstate.after.'))
        .map((type) => [type, fireDelay]),
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
      // `ready` hands its address to the main process once, never a stale one.
      expect(readyAddresses).toEqual([snapshot.context.address]);
      expect(snapshot.context.address).not.toEqual(staleAddress);
    },
    failed: (snapshot) => {
      expect(snapshot.context.failure).not.toBeNull();
      expect(readyAddresses).toEqual([]);
    },
    abandoning: () => {
      expect(latest(signalledPids)).toBe(startedAddress.pid);
    },
    retrying: () => {
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
        if (value === staleAddress) return `${name} (stale pid 200)`;
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

// The exact timing of each delay.
describe('server connection', () => {
  const value = () => server.getSnapshot().value;
  const context = () => server.getSnapshot().context;

  const spawnSupervisor = async () => {
    startServerMachine();
    await settle(() => latest(readAddressCalls).resolve(null));
    reportSpawned();
  };

  const startSupervisor = async () => {
    await spawnSupervisor();
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle(() => latest(readAddressCalls).resolve(startedAddress));
    expect(value()).toBe('ready');
  };

  // Reaches `failed` with the spawned Supervisor still owned, as when it ignores SIGTERM.
  const abandonStuckSupervisor = async () => {
    await spawnSupervisor();
    await vi.advanceTimersByTimeAsync(startLimitMs + stopLimitMs);
    expect(value()).toBe('failed');
  };

  it('announces each Server startup failure once', async () => {
    await abandonStuckSupervisor();
    expect(failures).toEqual([context().failure]);
    server.send({ type: 'server.exited', reason: 'Late exit' });
    expect(failures).toHaveLength(1);
    server.send({ type: 'server.retry' });
    await vi.advanceTimersByTimeAsync(stopLimitMs);
    expect(failures).toHaveLength(2);
    expect(failures[1]).toBe(context().failure);
  });

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
    // server.json was written before the spawn, by a process whose pid the OS reused.
    await settle(() => latest(readAddressCalls).resolve(staleAddress));
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    expect(readAddressCalls).toHaveLength(4);
    await settle(() => latest(readAddressCalls).resolve(startedAddress));

    expect(value()).toBe('ready');
    expect(readyAddresses).toEqual([startedAddress]);
  });

  it('abandons a Supervisor that does not answer in 30 seconds', async () => {
    await spawnSupervisor();

    await vi.advanceTimersByTimeAsync(startLimitMs - 1);
    expect(value()).toEqual({ starting: { answering: 'checking' } });
    await vi.advanceTimersByTimeAsync(1);

    expect(value()).toEqual({ abandoning: 'waiting' });
    expect(signalledPids).toEqual([startedAddress.pid]);
  });

  it('reuses the Supervisor that won the race to start when its own exits', async () => {
    await spawnSupervisor();

    reportExited();
    await settle(() => latest(readAddressCalls).resolve(runningAddress));

    expect(value()).toBe('ready');
    expect(context()).toEqual(
      expect.objectContaining({ ownedPid: null, failure: null }),
    );
    expect(readyAddresses).toEqual([runningAddress]);
  });

  it('fails when its Supervisor exits and no other runs', async () => {
    await spawnSupervisor();

    reportExited();
    await settle(() => latest(readAddressCalls).resolve(null));

    expect(value()).toBe('failed');
    expect(context().failure).toBe(exitReason);
    expect(signalledPids).toEqual([]);
  });

  it('gives up abandoning after 5 seconds, and keeps the pid', async () => {
    await spawnSupervisor();
    await vi.advanceTimersByTimeAsync(startLimitMs);

    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle(() => latest(checkRunningCalls).resolve(true));
    await vi.advanceTimersByTimeAsync(stopLimitMs - pollDelayMs - 1);
    expect(value()).toEqual({ abandoning: 'checking' });
    await vi.advanceTimersByTimeAsync(1);

    expect(value()).toBe('failed');
    expect(context().ownedPid).toBe(startedAddress.pid);
  });

  it('stops the last Supervisor on Retry before it starts over', async () => {
    await abandonStuckSupervisor();

    server.send({ type: 'server.retry' });
    expect(signalledPids).toEqual([startedAddress.pid, startedAddress.pid]);
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle(() => latest(checkRunningCalls).resolve(false));

    expect(value()).toBe('locating');
    expect(context()).toEqual(
      expect.objectContaining({ ownedPid: null, failure: null }),
    );
  });

  it('fails Retry again, spawning nothing, while the last Supervisor does not stop', async () => {
    await abandonStuckSupervisor();

    server.send({ type: 'server.retry' });
    await vi.advanceTimersByTimeAsync(stopLimitMs);

    expect(value()).toBe('failed');
    expect(context().ownedPid).toBe(startedAddress.pid);
    expect(spawnCalls).toHaveLength(1);
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
    expect(context().ownedPid).toBeNull();
  });
});
