import { describeModel, modelTest } from '@repo/vitest/model-test';
import { describe, expect, it, vi } from 'vitest';
import { states } from '#mocks/engine-model-assertions';
import {
  executors,
  latest,
  settle,
  startEngine,
} from '#mocks/engine-model-executors';
import {
  stopAllSessionsEvent,
  drainWriterEvent,
  stopEngineEvent,
  heartbeatIntervalMs,
  mockHttpServer,
} from '#mocks/engine-model-fixtures';
import { graph } from '#mocks/engine-model-graph';
import { machineWithExternalMocks, machine } from '#mocks/engine-model-logic';
import * as model from '#mocks/engine-model-state';
import { startModelEngine } from '#mocks/engine-model-state';
import {
  httpCloseLimit,
  sessionStopLimit,
  writerDrainLimit,
} from './setup.machine';

const engineModel = modelTest(machine, graph, {
  start: startEngine,
  executors,
  delays: {
    heartbeatInterval: heartbeatIntervalMs,
    httpCloseLimit,
    sessionStopLimit,
    writerDrainLimit,
  },
  states,
});

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
  vi.advanceTimersByTime(sessionStopLimit - 1);
  expect(model.logs).not.toContain(
    'Session stop limit reached; closing Agent resources',
  );
  vi.advanceTimersByTime(1);
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
  describeModel(engineModel);

  it('the generated paths walk every transition', (): void => {
    expect(engineModel.unwalked()).toEqual([]);
  });
});
