import { expect, vi } from 'vitest';
import type { EventExecutor } from 'xstate/graph';
import {
  heartbeatTimeoutMs,
  maxCrashesInWindow,
  readyTimeoutMs,
} from './machine';
import {
  backoffMs,
  engines,
  latestEngine,
  liveEngines,
  supervisor,
  startSupervisorActor,
  readyEngineEvent,
  engineExitedEvent,
  heartbeatEngineEvent,
  engineStoppedEvent,
  engineUnresolvedEvent,
  stopServerEvent,
  readyDelayEvent,
  heartbeatDelayEvent,
  backoffDelayEvent,
} from './machine-fixture.mocks';
import {
  input,
  machine,
  serverAddressWrites,
  serverAddressRemovals,
  type SupervisorSnapshot,
  type SupervisorEvent,
} from './machine-model.mocks';

// Moves to one millisecond short of a delay, checks the state held, then crosses it.
const crossDelay = (milliseconds: number): void => {
  const before = supervisor.getSnapshot().value;
  vi.advanceTimersByTime(milliseconds - 1);
  expect(supervisor.getSnapshot().value).toEqual(before);
  vi.advanceTimersByTime(1);
};

// Drives each graph event against the real Supervisor.
const eventExecutors = {
  'xstate.init': (): void => {
    startSupervisorActor(machine, input);
  },
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
  [readyDelayEvent]: (): void => crossDelay(readyTimeoutMs),
  [heartbeatDelayEvent]: (): void => crossDelay(heartbeatTimeoutMs),
  [backoffDelayEvent]: (): void =>
    crossDelay(backoffMs(supervisor.getSnapshot().context.crashTimes.length)),
};

export const executors = new Map<
  string,
  EventExecutor<SupervisorSnapshot, SupervisorEvent>
>(Object.entries(eventExecutors));

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
