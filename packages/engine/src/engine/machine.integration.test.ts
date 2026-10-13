import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { describe, expect, it, vi } from 'vitest';
import {
  type StatePath,
  type AdjacencyMap,
  getAdjacencyMap,
} from 'xstate/graph';
import { type EngineEvent } from '#mocks/engine-model-events';
import { latest, settle } from '#mocks/engine-model-executors';
import {
  stopAllSessionsEvent,
  drainWriterEvent,
  stopEngineEvent,
  mockHttpServer,
} from '#mocks/engine-model-fixtures';
import { options } from '#mocks/engine-model-graph';
import {
  machineWithExternalMocks,
  machine,
  type EngineSnapshot,
} from '#mocks/engine-model-logic';
import { paths, title } from '#mocks/engine-model-paths';
import * as model from '#mocks/engine-model-state';
import { startModelEngine } from '#mocks/engine-model-state';
import { executeStep } from '#mocks/engine-model-walk';
const startRunningEngine = async (logic = machine): Promise<void> => {
  startModelEngine(logic);
  await settle((): void =>
    latest(model.openDatabaseCalls).resolve(model.mockDatabase),
  );
  await settle((): void => latest(model.recoveryCalls).resolve());
  await settle((): void =>
    latest(model.startHttpServerCalls).resolve(mockHttpServer),
  );
};

it('finishes shutdown when the open Sessions machine and the writer complete immediately', async (): Promise<void> => {
  await startRunningEngine(machineWithExternalMocks);
  model.engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
  await settle((): void => latest(model.closeHttpServerCalls).resolve());
  expect(model.engine.getSnapshot().status).toBe('done');
  expect(model.engine.getSnapshot().output).toEqual({ exitCode: 0 });
  expect(model.databaseCloses).toBe(1);
  expect(
    model.logs.some((line): boolean => line.includes('limit reached')),
  ).toBe(false);
});

it('closes Agent resources before draining the writer when Sessions exceed their stop limit', async (): Promise<void> => {
  await startRunningEngine();
  model.engine.send({ type: stopEngineEvent, reason: 'SIGTERM' });
  await settle((): void => latest(model.closeHttpServerCalls).resolve());
  vi.advanceTimersByTime(10000);
  expect(model.logs).toContain(
    'Session stop limit reached; closing Agent resources',
  );
  model.engine.system.get('sessions').send({ type: stopAllSessionsEvent });
  await settle(() => latest(model.closeResourceCalls).resolve());
  expect(
    model.engine
      .getSnapshot()
      .matches({ live: { stopping: 'drainingWriter' } }),
  ).toBe(true);
  expect(model.databaseCloses).toBe(0);
  expect(model.shutdownCommands).toEqual([
    stopAllSessionsEvent,
    drainWriterEvent,
  ]);
  model.engine.system.get('databaseWriter').send({ type: drainWriterEvent });
  expect(model.engine.getSnapshot().status).toBe('done');
  expect(model.databaseCloses).toBe(1);
});

describe('engine model', (): void => {
  it.each(
    paths.map(
      (path): [string, StatePath<EngineSnapshot, EngineEvent>] =>
        [title(path), path] as const,
    ),
  )('%s', async (_, path): Promise<void> => {
    for (const step of path.steps) {
      await executeStep(step);
      expect(model.engine.getSnapshot().value).toEqual(step.state.value);
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
