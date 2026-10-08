import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
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
import type { EngineCommand } from './engine-message';
import { supervisorMachine } from './machine';

// Numbers written out so the model cannot grade itself.
const readyTimeoutMs = 15_000;
const heartbeatTimeoutMs = 5000;
const maxCrashes = 10;
const backoffMs = (crashes: number): number =>
  Math.min(500 * 2 ** (crashes - 1), 30_000);

interface MockEngine {
  send: (event: AnyEventObject) => void;
  exit: () => void;
  askedToStop: boolean;
  stopped: boolean;
}

let engines: MockEngine[];
let supervisor: Actor<typeof supervisorMachine>;

// An Engine that exits when asked, unless the test drives `engine.exited` itself.
const createMockEngine = (options: {
  exitsWhenAsked: boolean;
}): import('xstate').CallbackActorLogic<
  EngineCommand,
  { watch: boolean },
  import('xstate').EventObject
> =>
  fromCallback<EngineCommand, { watch: boolean }>(
    ({ sendBack, receive }): (() => void) => {
      const engine: MockEngine = {
        send: sendBack,
        exit: (): void => sendBack({ type: 'engine.exited' }),
        askedToStop: false,
        stopped: false,
      };
      engines.push(engine);
      receive((): void => {
        engine.askedToStop = true;
        if (options.exitsWhenAsked) engine.exit();
      });
      return (): void => {
        engine.stopped = true;
      };
    },
  );

const latestEngine = (): MockEngine =>
  engines.at(-1) ?? expect.unreachable('No engine was started');
const liveEngines = (): number =>
  engines.filter((engine): boolean => !engine.stopped).length;

beforeEach((): void => {
  vi.useFakeTimers();
  engines = [];
});

afterEach((): void => {
  supervisor?.stop();
  vi.useRealTimers();
});

describe('supervisor model', (): void => {
  let serverAddressWrites: unknown[];
  let serverAddressRemovals: number;

  const machine = supervisorMachine.provide({
    actors: { engine: createMockEngine({ exitsWhenAsked: false }) },
    actions: {
      writeServerAddress: ({ context }): void => {
        serverAddressWrites.push({
          port: context.port,
          version: context.version,
          startedAt: context.startedAt,
        });
      },
      removeServerAddress: (): void => {
        serverAddressRemovals += 1;
      },
    },
  });
  type SupervisorSnapshot = SnapshotFrom<typeof machine>;
  type SupervisorEvent = EventFromLogic<typeof machine>;

  const input = {
    now: (): number => 1000,
    home: '/unused',
    version: '1.2.3',
    startedAt: '2026-10-03T00:00:00.000Z',
    watch: false,
  };
  const payloads: Record<string, SupervisorEvent> = {
    'engine.ready': { type: 'engine.ready', port: 7337 },
    'engine.exit': { type: 'engine.exit', code: 1 },
  };
  const eventTypes = (node: DirectedGraphNode): string[] => [
    ...node.edges.map((edge): string => edge.label.text),
    ...node.children.flatMap(eventTypes),
  ];
  // The machine raises `xstate.done.state.*` itself, so the model must not send it.
  const events = [...new Set(eventTypes(toDirectedGraph(machine)))]
    .filter((type): boolean => !type.startsWith('xstate.done.state.'))
    .map(
      (type): SupervisorEvent =>
        payloads[type] ?? ({ type } as SupervisorEvent),
    );

  const model = new TestModel(machine, {
    input,
    events,
    limit: 10_000,
    // A done actor ignores events, but traversal still leaves a final state through the root `on`.
    filterEvents: (snapshot, event): boolean =>
      snapshot.status === 'active' && snapshot.can(event),
    // Crash count, not crash times; `via` gives self-transitions their own vertex.
    serializeState: (snapshot, event, previous): string =>
      JSON.stringify({
        value: snapshot.value,
        port: snapshot.context.port,
        crashes: snapshot.context.crashTimes.length,
        via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
      }),
    stateMatcher: (snapshot, key): boolean => snapshot.matches(key as never),
  });

  // Moves to one millisecond short of a delay, checks the state held, then crosses it.
  const crossDelay = (milliseconds: number): void => {
    const before = supervisor.getSnapshot().value;
    vi.advanceTimersByTime(milliseconds - 1);
    expect(supervisor.getSnapshot().value).toEqual(before);
    vi.advanceTimersByTime(1);
  };

  const executors: Record<
    string,
    EventExecutor<SupervisorSnapshot, SupervisorEvent>
  > = {
    'xstate.init': (): void => {
      supervisor = createActor(machine, { input }).start();
    },
    'engine.ready': (): void =>
      latestEngine().send({ type: 'engine.ready', port: 7337 }),
    'engine.heartbeat': (): void => {
      vi.advanceTimersByTime(heartbeatTimeoutMs - 1);
      latestEngine().send({ type: 'engine.heartbeat' });
    },
    'engine.exit': (): void =>
      latestEngine().send({ type: 'engine.exit', code: 1 }),
    'engine.exited': (): void => {
      expect(latestEngine().askedToStop).toBe(true);
      latestEngine().exit();
    },
    'server.stop': (): void => supervisor.send({ type: 'server.stop' }),
    'xstate.after.readyTimeout.supervisor.starting': (): void =>
      crossDelay(readyTimeoutMs),
    'xstate.after.heartbeatTimeout.supervisor.running': (): void =>
      crossDelay(heartbeatTimeoutMs),
    'xstate.after.backoff.supervisor.backingOff.delay.waiting': (): void =>
      crossDelay(backoffMs(supervisor.getSnapshot().context.crashTimes.length)),
  };

  const expectModelState = (expected: SupervisorSnapshot): void => {
    const actual = supervisor.getSnapshot();
    expect(actual.value).toEqual(expected.value);
    expect(actual.status).toBe(expected.status);
    expect(actual.context.crashTimes).toEqual(expected.context.crashTimes);
  };
  const ownAddress = {
    port: 7337,
    version: '1.2.3',
    startedAt: input.startedAt,
  };
  const states: Record<string, (snapshot: SupervisorSnapshot) => void> = {
    starting: (snapshot): void => {
      expectModelState(snapshot);
      expect(liveEngines()).toBe(1);
      if (snapshot.context.port === null)
        expect(serverAddressWrites).toEqual([]);
    },
    running: (snapshot): void => {
      expectModelState(snapshot);
      expect(liveEngines()).toBe(1);
      expect(serverAddressWrites.at(-1)).toEqual(ownAddress);
    },
    backingOff: (snapshot): void => {
      expectModelState(snapshot);
      expect(liveEngines()).toBe(
        snapshot.matches({ backingOff: { engine: 'exited' } }) ? 0 : 1,
      );
      expect(latestEngine().askedToStop).toBe(true);
      expect(snapshot.context.crashTimes.length).toBeLessThan(maxCrashes);
      expect(serverAddressRemovals).toBe(0);
    },
    failed: (snapshot): void => {
      expectModelState(snapshot);
      expect(snapshot.context.crashTimes).toHaveLength(maxCrashes);
      expect(liveEngines()).toBe(0);
      expect(serverAddressRemovals).toBe(1);
    },
    stopping: (snapshot): void => {
      expectModelState(snapshot);
      expect(liveEngines()).toBe(0);
      expect(serverAddressRemovals).toBe(1);
    },
  };

  const shortestPaths = model.getShortestPaths();
  const simplePaths = model.getSimplePaths({
    stopWhen: (snapshot): boolean => snapshot.context.crashTimes.length >= 2,
  });
  const title = (path: TestPath<SupervisorSnapshot, SupervisorEvent>): string =>
    path.steps
      .map(({ event }): string =>
        event.type.replace(/^xstate\.after\.(\w+)\..*$/, 'after $1'),
      )
      .join(' → ');

  beforeEach((): void => {
    serverAddressWrites = [];
    serverAddressRemovals = 0;
  });

  describe.each([
    ['shortest path', shortestPaths],
    ['simple path, up to two crashes', simplePaths],
  ])('%s', (_, paths): void => {
    it.each(
      paths.map(
        (path): [string, TestPath<SupervisorSnapshot, SupervisorEvent>] =>
          [title(path), path] as const,
      ),
    )('%s', async (_, path): Promise<void> => {
      await path.test({ events: executors, states });
    });
  });

  it('the generated paths walk every transition', (): void => {
    expect(
      unwalkedTransitions({
        models: [model],
        paths: [...shortestPaths, ...simplePaths],
        stateKey: (snapshot): string => JSON.stringify(snapshot.value),
        eventKey: (
          event,
        ):
          | 'engine.exit'
          | 'engine.exited'
          | 'engine.heartbeat'
          | 'engine.ready'
          | 'server.stop' => event.type,
      }),
    ).toEqual([]);
  });
});

// What the real server.json actions do on disk, and the crash window, which traversal cannot reach.
describe('supervisor', (): void => {
  let home: string;

  const serverJsonPath = (): string => join(home, 'server.json');
  const readServerJson = (): ReturnType<typeof JSON.parse> =>
    JSON.parse(readFileSync(serverJsonPath(), 'utf8'));
  const otherServerAddress = {
    pid: process.pid + 1,
    port: 7337,
    version: '1.2.3',
    startedAt: '2026-10-02T00:00:00.000Z',
  };
  const writeOtherServerJson = (): void =>
    writeFileSync(serverJsonPath(), JSON.stringify(otherServerAddress));

  const startSupervisor = (): typeof supervisor => {
    supervisor = createActor(
      supervisorMachine.provide({
        actors: { engine: createMockEngine({ exitsWhenAsked: true }) },
      }),
      {
        input: {
          now: (): number => Date.now(),
          home,
          version: '1.2.3',
          startedAt: '2026-10-03T00:00:00.000Z',
          watch: false,
        },
      },
    ).start();
    return supervisor;
  };

  const crashLatestEngine = (): void =>
    latestEngine().send({ type: 'engine.exit', code: 1 });

  // Crashes the Engine and returns how long the Supervisor waited before it started the next one.
  const crashAndWaitForRestart = (): number => {
    const before = engines.length;
    crashLatestEngine();
    let waited = 0;
    while (engines.length === before) {
      if (waited >= 60_000) throw new Error('The engine was not restarted');
      vi.advanceTimersByTime(100);
      waited += 100;
    }
    return waited;
  };

  const keepRunningFor = (milliseconds: number): void => {
    latestEngine().send({ type: 'engine.ready', port: 7337 });
    for (let waited = 0; waited < milliseconds; waited += 1000) {
      vi.advanceTimersByTime(1000);
      latestEngine().send({ type: 'engine.heartbeat' });
    }
  };

  beforeEach((): void => {
    home = mkdtempSync(join(tmpdir(), 'server-supervisor-'));
  });

  afterEach((): void => {
    rmSync(home, { recursive: true, force: true });
  });

  it('writes server.json atomically with its own pid and the engine port', (): void => {
    startSupervisor();
    expect(existsSync(serverJsonPath())).toBe(false);

    latestEngine().send({ type: 'engine.ready', port: 7337 });

    expect(readServerJson()).toEqual({
      pid: process.pid,
      port: 7337,
      version: '1.2.3',
      startedAt: '2026-10-03T00:00:00.000Z',
    });
    expect(readdirSync(home)).toEqual(['server.json']);
  });

  it('removes its own server.json when asked to stop', (): void => {
    startSupervisor();
    latestEngine().send({ type: 'engine.ready', port: 7337 });

    supervisor.send({ type: 'server.stop' });

    expect(existsSync(serverJsonPath())).toBe(false);
  });

  it('forgets crashes older than 10 minutes', (): void => {
    startSupervisor();

    for (let crash = 0; crash < 9; crash++) crashAndWaitForRestart();
    keepRunningFor(10 * 60_000);

    expect(crashAndWaitForRestart()).toBe(500);
    expect(supervisor.getSnapshot().value).toBe('starting');
  });

  it('still counts crashes from less than 10 minutes ago', (): void => {
    startSupervisor();

    for (let crash = 0; crash < 9; crash++) crashAndWaitForRestart();
    keepRunningFor(5 * 60_000);
    crashLatestEngine();

    expect(supervisor.getSnapshot().value).toBe('failed');
  });

  it('leaves a server.json with another pid when it fails', (): void => {
    startSupervisor();
    writeOtherServerJson();

    for (let crash = 0; crash < 9; crash++) crashAndWaitForRestart();
    crashLatestEngine();

    expect(supervisor.getSnapshot().value).toBe('failed');
    expect(readServerJson()).toEqual(otherServerAddress);
  });

  it('leaves a server.json with another pid when asked to stop', (): void => {
    startSupervisor();
    writeOtherServerJson();

    supervisor.send({ type: 'server.stop' });

    expect(supervisor.getSnapshot().value).toBe('stopping');
    expect(readServerJson()).toEqual(otherServerAddress);
  });
});
