import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AdjacencyMap,
  type EventExecutor,
  getAdjacencyMap,
} from 'xstate/graph';
import { createModelClock, type ModelClock } from './connection-clock.mocks';
import {
  type ConnectionActor,
  type ConnectionSnapshot,
  harness,
  linkState,
  lostError,
  machine,
  resetHarness,
  startConnection,
  stopConnections,
} from './connection-machine.mocks';
import {
  allPaths,
  type ConnectionGraphEvent,
  type ConnectionPath,
  connectionAttemptEvent,
  connectionLostEvent,
  connectionOpenedEvent,
  foregroundEvent,
  offlineDelayEvent,
  options,
  pathGroups,
  retryDelayEvent,
  retryEvent,
  title,
} from './connection-model.mocks';

let connection: ConnectionActor;

let modelClock: ModelClock;

beforeEach(() => {
  vi.useFakeTimers();
  resetHarness();
});

afterEach(() => {
  stopConnections();
  vi.useRealTimers();
});

const isDown = (snapshot: ConnectionSnapshot): boolean =>
  ['reconnecting', 'offline'].includes(linkState(snapshot));

// The path's first step starts the Connection; every other event has its own executor.
const executors: Record<
  ConnectionGraphEvent['type'] | 'xstate.init',
  EventExecutor<ConnectionSnapshot, ConnectionGraphEvent>
> = {
  'xstate.init': () => {
    modelClock = createModelClock();
    connection = startConnection(modelClock.clock);
  },
  [connectionOpenedEvent]: () => {
    const before = {
      refetches: harness.refetches,
      down: isDown(connection.getSnapshot()),
    };

    harness.watcher.send({ type: connectionOpenedEvent });
    expect(harness.refetches).toBe(before.refetches + (before.down ? 1 : 0));
  },
  [connectionLostEvent]: () => {
    harness.watcher.send({ type: connectionLostEvent, error: lostError });
  },
  [connectionAttemptEvent]: (step) => {
    const before = harness.allowedAttempts;
    connection.send({ type: connectionAttemptEvent });
    // An attempt allowed at once leaves nothing waiting.
    expect(harness.allowedAttempts).toBe(
      before + (step.state.value.attempt === 'idle' ? 1 : 0),
    );
  },
  [foregroundEvent]: () => {
    const before = harness.allowedAttempts;
    connection.send({ type: foregroundEvent });
    expect(harness.allowedAttempts).toBe(before + 1);
  },
  [retryEvent]: () => {
    const before = harness.allowedAttempts;
    const waiting = connection.getSnapshot().matches({ attempt: 'waiting' });
    connection.send({ type: retryEvent });
    // Try again shows Reconnecting, and lets a waiting attempt go at once.
    expect(linkState(connection.getSnapshot())).toBe('reconnecting');
    expect(harness.allowedAttempts).toBe(before + (waiting ? 1 : 0));
  },
  [retryDelayEvent]: (step) => {
    const before = harness.allowedAttempts;
    modelClock.fire(connection, step.event.type);
    expect(harness.allowedAttempts).toBe(before + 1);
  },
  [offlineDelayEvent]: (step) => {
    modelClock.fire(connection, step.event.type);
  },
};

const walk = async (step: ConnectionPath['steps'][number]): Promise<void> => {
  await executors[step.event.type](step);
};

type ObservedStep = { value: ConnectionSnapshot['value']; attempted: boolean };

const observed = (snapshot: ConnectionSnapshot): ObservedStep => ({
  value: snapshot.value,
  attempted: snapshot.context.attempts > 0,
});

describe('connection model', () => {
  describe.each(pathGroups)('%s', (_, paths) => {
    it.each(paths.map((path) => [title(path), path] as const))(
      '%s',
      async (_, path) => {
        for (const step of path.steps) {
          await walk(step);
          expect({
            ...observed(connection.getSnapshot()),
            watching: harness.watcher.live,
          }).toEqual({ ...observed(step.state), watching: true });
        }
      },
    );
  });

  it('the generated paths walk every transition', () => {
    expect(
      unwalkedTransitions({
        models: [
          {
            getAdjacencyMap: (): AdjacencyMap<
              ConnectionSnapshot,
              ConnectionGraphEvent
            > => getAdjacencyMap(machine, options),
          },
        ],
        paths: allPaths,
        stateKey: (snapshot) => JSON.stringify(snapshot.value),
        eventKey: (event) => event.type,
      }),
    ).toEqual([]);
  });
});
