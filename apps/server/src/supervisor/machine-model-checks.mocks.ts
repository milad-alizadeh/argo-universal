import { expect, vi } from 'vitest';
import { heartbeatTimeoutMs, maxCrashesInWindow } from './machine';
import {
  engines,
  latestEngine,
  liveEngines,
  supervisor,
  readyEngineEvent,
  engineExitedEvent,
  heartbeatEngineEvent,
  engineStoppedEvent,
  engineUnresolvedEvent,
  stopServerEvent,
} from './machine-fixture.mocks';
import {
  input,
  serverAddressWrites,
  serverAddressRemovals,
  type SupervisorSnapshot,
} from './machine-model.mocks';

// Drives each graph event against the real Supervisor.
export const executors = {
  'engine.ready': (): void =>
    latestEngine().send({ type: readyEngineEvent, port: 7337 }),
  [heartbeatEngineEvent]: (): void => {
    vi.advanceTimersByTime(heartbeatTimeoutMs - 1);
    latestEngine().send({ type: heartbeatEngineEvent });
  },
  'engine.exit': (): void =>
    latestEngine().send({ type: engineExitedEvent, code: 1 }),
  [engineStoppedEvent]: (): void => {
    expect(latestEngine().askedToStop).toBe(true);
    latestEngine().exit();
  },
  [engineUnresolvedEvent]: (): void => {
    expect(latestEngine().askedToStop).toBe(true);
    latestEngine().unresolved();
  },
  'server.stop': (): void => supervisor.send({ type: stopServerEvent }),
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

export const states = {
  starting: (snapshot: SupervisorSnapshot): void => {
    expectModelState(snapshot);
    expect(liveEngines()).toBe(1);

    if (snapshot.context.port === null) expect(serverAddressWrites).toEqual([]);
  },
  running: (snapshot: SupervisorSnapshot): void => {
    expectModelState(snapshot);
    expect(liveEngines()).toBe(1);
    expect(serverAddressWrites.at(-1)).toEqual(ownAddress);
  },
  backingOff: (snapshot: SupervisorSnapshot): void => {
    expectModelState(snapshot);
    expect(liveEngines()).toBe(
      snapshot.matches({ backingOff: { engine: 'exited' } }) ? 0 : 1,
    );
    expect(latestEngine().askedToStop).toBe(true);
    expect(snapshot.context.crashTimes.length).toBeLessThan(maxCrashesInWindow);
    expect(serverAddressRemovals).toBe(0);
  },
  failed: (snapshot: SupervisorSnapshot): void => {
    expectModelState(snapshot);
    expect(snapshot.context.crashTimes).toHaveLength(maxCrashesInWindow);
    expect(liveEngines()).toBe(0);
    expect(serverAddressRemovals).toBe(1);
  },
  stopping: (snapshot: SupervisorSnapshot): void => {
    expectModelState(snapshot);
    expect(liveEngines()).toBe(0);
    expect(serverAddressRemovals).toBe(1);
  },
  // Release could not be verified: no replacement Engine starts.
  blocked: (snapshot: SupervisorSnapshot): void => {
    expectModelState(snapshot);
    expect(snapshot.status).toBe('done');
    expect(liveEngines()).toBe(0);
    expect(engines).toHaveLength(snapshot.context.crashTimes.length);
    expect(serverAddressRemovals).toBe(1);
  },
};
