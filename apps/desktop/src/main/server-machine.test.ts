import type { ServerAddress } from '@repo/contracts';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import {
  type GraphEventFromLogic,
  getShortestPaths,
  getSimplePaths,
  getAdjacencyMap,
} from '@repo/vitest/model-graph';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  matchesState,
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
  type AdjacencyMap,
  toDirectedGraph,
} from 'xstate/graph';
import {
  type CheckRunningInput,
  type ServerInput,
  type SpawnInput,
  pollDelayMs,
  serverConnectionMachine,
  startLimitMs,
  stopLimitMs,
} from './server-machine';

const supervisorExitedEvent = 'server.exited';

const supervisorSpawnedEvent = 'server.spawned';

const retryServerEvent = 'server.retry';

const countsChangedEvent = 'counts.changed';

const quitDoneEvent = 'xstate.done.actor.askQuit';

const quitErrorEvent = 'xstate.error.actor.askQuit';

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
  reject: (error: Error) => void;
}

interface SpawnCall {
  input: SpawnInput;
  live: boolean;
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

let readAddressCalls: PendingCall<ServerInput, ServerAddress | null>[];

let checkRunningCalls: PendingCall<CheckRunningInput, boolean>[];

let spawnCalls: SpawnCall[];

let quitCalls: PendingCall<
  { running: number; ask: ServerInput['askToKeepSessions'] },
  boolean
>[];

let badges: number[];

const expectBadge = (attention: number): void => {
  expect(badges.at(-1)).toBe(attention);
};

let signalledPids: (number | null)[];

let readyAddresses: ServerAddress[];

let failures: (string | null)[];

let server: Actor<typeof machine>;

const machine = serverConnectionMachine.provide({
  actors: {
    watchCounts: fromCallback(() => {}),
    askQuit: createPromiseMock(() => quitCalls),
    readAddress: createPromiseMock(
      (): PendingCall<ServerInput, ServerAddress | null>[] => readAddressCalls,
    ),
    checkRunning: createPromiseMock(
      (): PendingCall<CheckRunningInput, boolean>[] => checkRunningCalls,
    ),
    spawnSupervisor: fromCallback<AnyEventObject, SpawnInput>(
      ({ input }): (() => void) => {
        const call = { input, live: true };
        spawnCalls.push(call);

        return (): void => {
          call.live = false;
        };
      },
    ),
  },
  actions: {
    signalOwnedSupervisor: ({ context }): void => {
      signalledPids.push(context.ownedPid);
    },
    log: (): void => {},
  },
});

type ServerSnapshot = SnapshotFrom<typeof machine>;

const input: ServerInput = {
  home: '/unused',
  cliDirectory: '/unused',
  askToKeepSessions: async () => false,
};

const startServerMachine = (): typeof server => {
  server = createActor(machine, { input });
  server.on('server.ready', ({ address }): void => {
    readyAddresses.push(address);
  });
  server.on('server.failed', ({ failure }): void => {
    failures.push(failure);
  });
  server.on('badge.changed', ({ attention }): void => {
    badges.push(attention);
  });
  server.start();

  return server;
};

const latest = <TCall>(calls: TCall[]): NonNullable<TCall> =>
  calls.at(-1) ?? expect.unreachable('The actor was not invoked');

// What the real `spawnSupervisor` sends to the machine it was given.
const reportSpawned = (): void =>
  latest(spawnCalls).input.parent.send({
    type: supervisorSpawnedEvent,
    pid: startedAddress.pid,
    at: spawnedAt,
  });

const reportExited = (): void =>
  latest(spawnCalls).input.parent.send({
    type: supervisorExitedEvent,
    reason: exitReason,
  });

// Settles a mock promise, then lets the machine take its done or error event.
const settle = async (settleCall: () => void): Promise<void> => {
  settleCall();
  await vi.advanceTimersByTimeAsync(0);
};

beforeEach((): void => {
  vi.useFakeTimers();
  readAddressCalls = [];
  checkRunningCalls = [];
  spawnCalls = [];
  quitCalls = [];
  badges = [];
  signalledPids = [];
  readyAddresses = [];
  failures = [];
});

afterEach((): void => {
  server?.stop();
  vi.useRealTimers();
});

describe('server connection model', (): void => {
  const readError = new Error('EACCES');
  const readAddressDoneEvent = 'xstate.done.actor.readAddress';
  const readAddressErrorEvent = 'xstate.error.actor.readAddress';
  const checkRunningDoneEvent = 'xstate.done.actor.checkRunning';

  // Done and error events of invoked actors are not in the machine's event type, but the model drives them.
  const fixtures = [
    ...[runningAddress, null, startedAddress, staleAddress].map(
      (output) =>
        ({
          type: readAddressDoneEvent,
          output,
          actorId: 'readAddress',
        }) as const,
    ),
    {
      type: readAddressErrorEvent,
      error: readError,
      actorId: 'readAddress',
    },
    ...[true, false].map(
      (output) =>
        ({
          type: checkRunningDoneEvent,
          output,
          actorId: 'checkRunning',
        }) as const,
    ),
    { type: supervisorSpawnedEvent, pid: startedAddress.pid, at: spawnedAt },
    { type: supervisorExitedEvent, reason: exitReason },
    { type: retryServerEvent },
    { type: 'app.quit' },
    { type: countsChangedEvent, counts: { running: 2, attention: 1 } },
    { type: countsChangedEvent, counts: { running: 0, attention: 0 } },
    { type: countsChangedEvent, counts: { running: 0, attention: 3 } },
    { type: 'counts.disconnected' },
    { type: quitDoneEvent, actorId: 'askQuit', output: true },
    { type: quitDoneEvent, actorId: 'askQuit', output: false },
    {
      type: quitErrorEvent,
      actorId: 'askQuit',
      error: readError,
    },
    {
      type: 'xstate.after.pollDelay.serverConnection.starting.answering.waiting',
    },
    { type: 'xstate.after.pollDelay.serverConnection.abandoning.waiting' },
    { type: 'xstate.after.pollDelay.serverConnection.retrying.waiting' },
    { type: 'xstate.after.pollDelay.serverConnection.stopping.waiting' },
    { type: 'xstate.after.startLimit.serverConnection.starting.answering' },
    { type: 'xstate.after.stopLimit.serverConnection.abandoning' },
    { type: 'xstate.after.stopLimit.serverConnection.retrying' },
    { type: 'xstate.after.stopLimit.serverConnection.stopping' },
  ] satisfies GraphEventFromLogic<typeof machine>[];

  type ServerEvent = (typeof fixtures)[number];

  const eventTypes = (node: DirectedGraphNode): string[] => [
    ...node.edges.map((edge): string => edge.label.text),
    ...node.children.flatMap(eventTypes),
  ];

  const types = [...new Set(eventTypes(toDirectedGraph(machine)))];

  const events = types.flatMap((type): ServerEvent[] => {
    const matching = fixtures.filter((event) => event.type === type);

    if (!matching.length)
      throw new Error(`Missing Server graph fixture for ${type}`);

    return matching;
  });

  const output = (
    event: ServerEvent,
  ): ServerAddress | null | boolean | undefined =>
    'output' in event ? event.output : undefined;

  const canGraphEvent = (
    snapshot: ServerSnapshot,
    event: ServerEvent,
  ): boolean => {
    switch (event.type) {
      case quitDoneEvent:
      case quitErrorEvent:
        return snapshot.matches({ ready: 'confirming' });
      case readAddressDoneEvent:
      case readAddressErrorEvent:
        return (
          snapshot.matches('locating') ||
          snapshot.matches('rechecking') ||
          snapshot.matches({ starting: { answering: 'checking' } })
        );
      case checkRunningDoneEvent:
        return (
          snapshot.matches({ abandoning: 'checking' }) ||
          snapshot.matches({ retrying: 'checking' }) ||
          snapshot.matches({ stopping: 'checking' })
        );
      case 'xstate.after.pollDelay.serverConnection.starting.answering.waiting':
        return snapshot.matches({ starting: { answering: 'waiting' } });
      case 'xstate.after.pollDelay.serverConnection.abandoning.waiting':
        return snapshot.matches({ abandoning: 'waiting' });
      case 'xstate.after.pollDelay.serverConnection.retrying.waiting':
        return snapshot.matches({ retrying: 'waiting' });
      case 'xstate.after.pollDelay.serverConnection.stopping.waiting':
        return snapshot.matches({ stopping: 'waiting' });
      case 'xstate.after.startLimit.serverConnection.starting.answering':
        return snapshot.matches({ starting: 'answering' });
      case 'xstate.after.stopLimit.serverConnection.abandoning':
        return snapshot.matches('abandoning');
      case 'xstate.after.stopLimit.serverConnection.retrying':
        return snapshot.matches('retrying');
      case 'xstate.after.stopLimit.serverConnection.stopping':
        return snapshot.matches('stopping');
      default:
        return snapshot.can(event);
    }
  };

  // Never the address itself, only whose it is.
  type Vertex = {
    value: ServerSnapshot['value'];
    address: number | null;
    ownedPid: ServerSnapshot['context']['ownedPid'];
    failure: boolean;
    running: number;
  };

  const vertex = (snapshot: ServerSnapshot): Vertex => ({
    value: snapshot.value,
    address: snapshot.context.address?.pid ?? null,
    ownedPid: snapshot.context.ownedPid,
    failure: snapshot.context.failure !== null,
    running: snapshot.context.running,
  });

  const options = {
    input,
    events,
    // A done actor ignores events, but traversal still leaves a final state through the root `on`; a stale server.json only matters while the spawned Supervisor answers.
    filterEvents: (snapshot: ServerSnapshot, event: ServerEvent): boolean =>
      snapshot.status === 'active' &&
      canGraphEvent(snapshot, event) &&
      (output(event) !== staleAddress ||
        snapshot.matches({ starting: { answering: 'checking' } })),
    // `via` gives each step into a state its own vertex, so the shortest paths walk every transition.
    serializeState: (
      snapshot: ServerSnapshot,
      event: ServerEvent | undefined,
      previous?: ServerSnapshot,
    ): string =>
      JSON.stringify({
        ...vertex(snapshot),
        via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
      }),
  };

  // Without `via`: with it, the polling loops give thousands of simple paths.
  const simplePathOptions = {
    ...options,
    serializeState: (snapshot: ServerSnapshot): string =>
      JSON.stringify(vertex(snapshot)),
  };

  // Fires timers in order until the delayed transition has run; an earlier `pollDelay` may fire on the way.
  const fireDelay: EventExecutor<ServerSnapshot, ServerEvent> = async ({
    state,
  }): Promise<void> => {
    for (let timers = 0; timers < 5; timers++) {
      await vi.advanceTimersToNextTimerAsync();
      const actual = server.getSnapshot().value;

      if (JSON.stringify(actual) === JSON.stringify(state.value)) return;
    }

    expect.unreachable(`${JSON.stringify(state.value)} was never reached`);
  };

  const executors = new Map(
    Object.entries({
      'xstate.init': (): void => {
        startServerMachine();
      },
      [readAddressDoneEvent]: ({ event }): Promise<void> => {
        if (event.type !== readAddressDoneEvent)
          throw new Error('Expected address result');

        return settle((): void =>
          latest(readAddressCalls).resolve(event.output),
        );
      },
      [readAddressErrorEvent]: (): Promise<void> =>
        settle((): void => latest(readAddressCalls).reject(readError)),
      [checkRunningDoneEvent]: ({ event }): Promise<void> => {
        if (event.type !== checkRunningDoneEvent)
          throw new Error('Expected process result');

        return settle((): void =>
          latest(checkRunningCalls).resolve(event.output),
        );
      },
      'server.spawned': reportSpawned,
      'server.exited': reportExited,
      'server.retry': (): void => server.send({ type: retryServerEvent }),
      'app.quit': (): void => server.send({ type: 'app.quit' }),
      [countsChangedEvent]: ({ event }): void => {
        if (event.type !== countsChangedEvent)
          throw new Error('Expected counts');
        server.send(event);
        expectBadge(event.counts.attention);
      },
      'counts.disconnected': (): void => {
        server.send({ type: 'counts.disconnected' });
        expectBadge(0);
      },
      [quitDoneEvent]: async ({ event }): Promise<void> => {
        if (event.type !== quitDoneEvent)
          throw new Error('Expected quit answer');
        await settle(() => latest(quitCalls).resolve(event.output));
      },
      [quitErrorEvent]: (): Promise<void> =>
        settle(() => latest(quitCalls).reject(readError)),
      ...Object.fromEntries(
        types.flatMap(
          (type): [string, EventExecutor<ServerSnapshot, ServerEvent>][] =>
            type.startsWith('xstate.after.') ? [[type, fireDelay]] : [],
        ),
      ),
    } satisfies Record<string, EventExecutor<ServerSnapshot, ServerEvent>>),
  );

  const states = {
    '*': (snapshot: ServerSnapshot): void => {
      const actual = server.getSnapshot();
      expect(actual.value).toEqual(snapshot.value);
      expect(actual.status).toBe(snapshot.status);
      expect(actual.context.address).toEqual(snapshot.context.address);
      expect(actual.context.ownedPid).toBe(snapshot.context.ownedPid);
      expect(actual.context.running).toBe(snapshot.context.running);

      expect(actual.context.failure === null).toBe(
        snapshot.context.failure === null,
      );
      // A Supervisor that this app did not start is never signalled.
      expect(signalledPids).not.toContain(runningAddress.pid);
      // Only `starting` listens to the Supervisor it spawned.
      expect(spawnCalls.filter((call): boolean => call.live)).toHaveLength(
        snapshot.matches('starting') ? 1 : 0,
      );
    },
    ready: (snapshot: ServerSnapshot): void => {
      // Each entry hands the main process the address it holds, never a stale one.
      expect(latest(readyAddresses)).toEqual(snapshot.context.address);
      expect(snapshot.context.address).not.toEqual(staleAddress);
    },
    failed: (snapshot: ServerSnapshot): void => {
      expect(snapshot.context.failure).not.toBeNull();
      // Each entry announces the failure it holds.
      expect(latest(failures)).toBe(snapshot.context.failure);
    },
    abandoning: (): void => {
      expect(latest(signalledPids)).toBe(startedAddress.pid);
    },
    retrying: (): void => {
      expect(latest(signalledPids)).toBe(startedAddress.pid);
    },
    stopping: (): void => {
      expect(latest(signalledPids)).toBe(startedAddress.pid);
    },
    stopped: (): void => {
      expect(server.getSnapshot().status).toBe('done');
    },
  };

  const shortestPaths = terminalPaths(getShortestPaths(machine, options));

  const simplePaths = terminalPaths(
    getSimplePaths(machine, {
      ...simplePathOptions,
      // Try again from `ready` leads back to `locating`, and that cycle multiplies the simple paths; the shortest paths and the adjacency check below still walk it.
      filterEvents: (snapshot: ServerSnapshot, event: ServerEvent): boolean =>
        simplePathOptions.filterEvents(snapshot, event) &&
        !event.type.startsWith('counts.') &&
        !(event.type === retryServerEvent && snapshot.matches('ready')),
    }),
  );

  const title = (path: StatePath<ServerSnapshot, ServerEvent>): string =>
    path.steps
      .map(({ event }): string => {
        const name = event.type
          .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
          .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1');

        if (!('output' in event)) return name;
        const value = event.output;

        if (typeof value === 'boolean')
          return `${name} (${value ? 'running' : 'exited'})`;

        if (value === staleAddress) return `${name} (stale pid 200)`;

        return `${name} (${value == null ? 'none' : `pid ${value.pid}`})`;
      })
      .join(' → ');

  describe.each([
    ['shortest path', shortestPaths],
    ['simple path', simplePaths],
  ])('%s', (_, paths): void => {
    it.each(
      paths.map(
        (path): [string, StatePath<ServerSnapshot, ServerEvent>] =>
          [title(path), path] as const,
      ),
    )('%s', async (_, path): Promise<void> => {
      for (const step of path.steps) {
        const execute = executors.get(step.event.type);

        if (!execute)
          throw new Error(`Missing Server executor for ${step.event.type}`);
        await execute(step);
        states['*']?.(step.state);

        for (const [key, assertState] of Object.entries(states)) {
          if (key !== '*' && matchesState(key, step.state.value))
            assertState(step.state);
        }
      }
    });
  });

  it('the generated paths walk every transition', (): void => {
    expect(
      unwalkedTransitions({
        models: [
          {
            getAdjacencyMap: (): AdjacencyMap<ServerSnapshot, ServerEvent> =>
              getAdjacencyMap(machine, options),
          },
        ],
        paths: [...shortestPaths, ...simplePaths],
        stateKey: (snapshot): string => JSON.stringify(snapshot.value),
        eventKey: (event): typeof event.type => event.type,
      }),
    ).toEqual([]);
  });
});

// The exact timing of each delay.
describe('server connection', (): void => {
  const value = (): ServerSnapshot['value'] => server.getSnapshot().value;
  const context = (): ServerSnapshot['context'] => server.getSnapshot().context;

  const spawnSupervisor = async (): Promise<void> => {
    startServerMachine();
    await settle((): void => latest(readAddressCalls).resolve(null));
    reportSpawned();
  };

  const startSupervisor = async (): Promise<void> => {
    await spawnSupervisor();
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle((): void => latest(readAddressCalls).resolve(startedAddress));
    expect(value()).toEqual({ ready: 'active' });
  };

  // Reaches `failed` with the spawned Supervisor still owned, as when it ignores SIGTERM.
  const abandonStuckSupervisor = async (): Promise<void> => {
    await spawnSupervisor();
    await vi.advanceTimersByTimeAsync(startLimitMs + stopLimitMs);
    expect(value()).toBe('failed');
  };

  it('accepts delayed Supervisor pid reporting after its start time', async (): Promise<void> => {
    await spawnSupervisor();
    const address = { ...startedAddress, pid: 201 };
    server.send({
      type: supervisorSpawnedEvent,
      pid: address.pid,
      at: Date.parse('2026-10-03T10:01:00.000Z'),
    });
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle((): void => latest(readAddressCalls).resolve(address));
    expect(readyAddresses).toEqual([address]);
  });

  it('announces each Server startup failure once', async (): Promise<void> => {
    await abandonStuckSupervisor();
    expect(failures).toEqual([context().failure]);
    server.send({ type: supervisorExitedEvent, reason: 'Late exit' });
    expect(failures).toHaveLength(1);
    server.send({ type: retryServerEvent });
    await vi.advanceTimersByTimeAsync(stopLimitMs);
    expect(failures).toHaveLength(2);
    expect(failures[1]).toBe(context().failure);
  });

  it('reads server.json every poll delay until it names the spawned Supervisor', async (): Promise<void> => {
    await spawnSupervisor();
    expect(readAddressCalls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(pollDelayMs - 1);
    expect(readAddressCalls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(readAddressCalls).toHaveLength(2);
    // server.json still names an older Supervisor.
    await settle((): void => latest(readAddressCalls).resolve(runningAddress));
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    // server.json was written before the spawn, by a process whose pid the OS reused.
    await settle((): void => latest(readAddressCalls).resolve(staleAddress));
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    expect(readAddressCalls).toHaveLength(4);
    await settle((): void => latest(readAddressCalls).resolve(startedAddress));

    expect(value()).toEqual({ ready: 'active' });
    expect(readyAddresses).toEqual([startedAddress]);
  });

  it('abandons a Supervisor that does not answer in 30 seconds', async (): Promise<void> => {
    await spawnSupervisor();

    await vi.advanceTimersByTimeAsync(startLimitMs - 1);
    expect(value()).toEqual({ starting: { answering: 'checking' } });
    await vi.advanceTimersByTimeAsync(1);

    expect(value()).toEqual({ abandoning: 'waiting' });
    expect(signalledPids).toEqual([startedAddress.pid]);
  });

  it('reuses the Supervisor that won the race to start when its own exits', async (): Promise<void> => {
    await spawnSupervisor();

    reportExited();
    await settle((): void => latest(readAddressCalls).resolve(runningAddress));

    expect(value()).toEqual({ ready: 'active' });
    expect(context()).toEqual(
      expect.objectContaining({ ownedPid: null, failure: null }),
    );
    expect(readyAddresses).toEqual([runningAddress]);
  });

  it('fails when its Supervisor exits and no other runs', async (): Promise<void> => {
    await spawnSupervisor();

    reportExited();
    await settle((): void => latest(readAddressCalls).resolve(null));

    expect(value()).toBe('failed');
    expect(context().failure).toBe(exitReason);
    expect(signalledPids).toEqual([]);
  });

  it('gives up abandoning after 5 seconds, and keeps the pid', async (): Promise<void> => {
    await spawnSupervisor();
    await vi.advanceTimersByTimeAsync(startLimitMs);

    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle((): void => latest(checkRunningCalls).resolve(true));
    await vi.advanceTimersByTimeAsync(stopLimitMs - pollDelayMs - 1);
    expect(value()).toEqual({ abandoning: 'checking' });
    await vi.advanceTimersByTimeAsync(1);

    expect(value()).toBe('failed');
    expect(context().ownedPid).toBe(startedAddress.pid);
  });

  it('makes sure a Supervisor runs again when Try again follows a Server that died', async (): Promise<void> => {
    await startSupervisor();
    // The Supervisor was killed and took server.json with it.
    server.send({ type: retryServerEvent });

    expect(value()).toBe('locating');
    await settle((): void => latest(readAddressCalls).resolve(null));
    expect(value()).toEqual({ starting: 'spawning' });
    // Nothing is left to signal, so Try again kills no one.
    expect(signalledPids).toEqual([]);

    reportSpawned();
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle((): void => latest(readAddressCalls).resolve(startedAddress));

    expect(value()).toEqual({ ready: 'active' });
    expect(readyAddresses).toEqual([startedAddress, startedAddress]);
  });

  it('reuses the Supervisor that is still listening when Try again arrives', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: retryServerEvent });
    await settle((): void => latest(readAddressCalls).resolve(startedAddress));

    expect(value()).toEqual({ ready: 'active' });
    expect(signalledPids).toEqual([]);
    expect(context().ownedPid).toBe(startedAddress.pid);
    // Only the launch spawned a Supervisor; Try again found the same one.
    expect(spawnCalls).toHaveLength(1);
  });

  it('stops the last Supervisor on Retry before it starts over', async (): Promise<void> => {
    await abandonStuckSupervisor();

    server.send({ type: retryServerEvent });
    expect(signalledPids).toEqual([startedAddress.pid, startedAddress.pid]);
    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle((): void => latest(checkRunningCalls).resolve(false));

    expect(value()).toBe('locating');
    expect(context()).toEqual(
      expect.objectContaining({ ownedPid: null, failure: null }),
    );
  });

  it('fails Retry again, spawning nothing, while the last Supervisor does not stop', async (): Promise<void> => {
    await abandonStuckSupervisor();

    server.send({ type: retryServerEvent });
    await vi.advanceTimersByTimeAsync(stopLimitMs);

    expect(value()).toBe('failed');
    expect(context().ownedPid).toBe(startedAddress.pid);
    expect(spawnCalls).toHaveLength(1);
  });

  it('waits 5 seconds at most for the Supervisor it started to stop on quit', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: 'app.quit' });
    expect(signalledPids).toEqual([startedAddress.pid]);

    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle((): void => latest(checkRunningCalls).resolve(true));
    await vi.advanceTimersByTimeAsync(stopLimitMs - pollDelayMs - 1);
    expect(value()).toEqual({ stopping: 'checking' });
    await vi.advanceTimersByTimeAsync(1);

    expect(server.getSnapshot().status).toBe('done');
  });

  it('quits as soon as the Supervisor it started exits', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: 'app.quit' });

    await vi.advanceTimersByTimeAsync(pollDelayMs);
    await settle((): void => latest(checkRunningCalls).resolve(false));

    expect(server.getSnapshot().status).toBe('done');
    expect(context().ownedPid).toBeNull();
  });
});
