import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor, matchesState } from 'xstate';
import {
  getShortestPaths,
  getAdjacencyMap,
  type AdjacencyMap,
  type StatePath,
} from 'xstate/graph';
import {
  machine,
  machineWithExternalMocks,
  type EngineSnapshot,
} from '#mocks/engine-lifecycle-actors';
import { executors, latest, settle } from '#mocks/engine-lifecycle-executors';
import { type EngineEvent } from '#mocks/engine-lifecycle-fixtures';
import { options } from '#mocks/engine-lifecycle-graph';
import {
  input,
  stopEngineEvent,
  stopAllSessionsEvent,
  drainWriterEvent,
} from '#mocks/engine-lifecycle-input';
import {
  record,
  resetLifecycle,
  resetCalls,
  mockHttpServer,
} from '#mocks/engine-lifecycle-record';
import { shutdownStates } from '#mocks/engine-lifecycle-shutdown-assertions';
import { startupStates } from '#mocks/engine-lifecycle-startup-assertions';
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
  resetLifecycle();
  resetCalls();
});
afterEach((): void => {
  record.engine.stop();
  record.removeDatabase();
  vi.useRealTimers();
});
const startRunningEngine = async (logic = machine): Promise<void> => {
  record.engine = createActor(logic, { input }).start();
  await settle((): void =>
    latest(record.openDatabaseCalls).resolve(record.mockDatabase),
  );
  await settle((): void => latest(record.recoveryCalls).resolve());
  await settle((): void =>
    latest(record.startHttpServerCalls).resolve(mockHttpServer),
  );
};

it('finishes shutdown when the open Sessions machine and the writer complete immediately', async (): Promise<void> => {
  await startRunningEngine(machineWithExternalMocks);
  record.engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
  await settle((): void => latest(record.closeHttpServerCalls).resolve());
  expect(record.engine.getSnapshot().status).toBe('done');
  expect(record.engine.getSnapshot().output).toEqual({ exitCode: 0 });
  expect(record.databaseCloses).toBe(1);
  expect(
    record.logs.some((line): boolean => line.includes('limit reached')),
  ).toBe(false);
});

it('closes Agent resources before draining the writer when Sessions exceed their stop limit', async (): Promise<void> => {
  await startRunningEngine();
  record.engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
  await settle((): void => latest(record.closeHttpServerCalls).resolve());
  vi.advanceTimersByTime(10000);
  expect(record.logs).toContain(
    'Session stop limit reached; closing Agent resources',
  );
  record.engine.system.get('sessions').send({ type: stopAllSessionsEvent });
  await settle(() => latest(record.closeResourceCalls).resolve());
  expect(
    record.engine
      .getSnapshot()
      .matches({ live: { stopping: 'drainingWriter' } }),
  ).toBe(true);
  expect(record.databaseCloses).toBe(0);
  expect(record.shutdownCommands).toEqual([
    stopAllSessionsEvent,
    drainWriterEvent,
  ]);
  record.engine.system.get('databaseWriter').send({ type: drainWriterEvent });
  expect(record.engine.getSnapshot().status).toBe('done');
  expect(record.databaseCloses).toBe(1);
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
      assertMatchingStates(step.state);
      expect(record.engine.getSnapshot().value).toEqual(step.state.value);
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

function assertMatchingStates(snapshot: EngineSnapshot): void {
  const states = Object.entries({ ...startupStates, ...shutdownStates }).filter(
    ([key]) => matchesState(key, snapshot.value),
  );
  for (const [, assertState] of states) assertState(snapshot);
}
