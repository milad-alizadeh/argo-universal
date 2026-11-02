import { pollIntervalMs, startLimitMs, stopLimitMs } from '@repo/process';
import { expect, vi } from 'vitest';
import {
  latest,
  readAddressCalls,
  reportSpawned,
  server,
  type ServerSnapshot,
  settle,
  startServerMachine,
  startedAddress,
} from './server-machine.mocks';
import { releaseLimitMs } from './session-counts';

export const value = (): ServerSnapshot['value'] => server.getSnapshot().value;

export const context = (): ServerSnapshot['context'] =>
  server.getSnapshot().context;

export const spawnSupervisor = async (): Promise<void> => {
  startServerMachine();
  await settle((): void => latest(readAddressCalls).resolve(null));
  reportSpawned();
};

export const startSupervisor = async (): Promise<void> => {
  await spawnSupervisor();
  await vi.advanceTimersByTimeAsync(pollIntervalMs);
  await settle((): void => latest(readAddressCalls).resolve(startedAddress));
  expect(value()).toEqual({ ready: 'active' });
};

// Quits the App: the Server Connection lets go first, after the Server has said it does not keep running.
export const quitTheApp = (): void => {
  server.send({ type: 'app.quit' });
  serverSays(false);
  server.send(released);
};

// Reaches `failed` with the spawned Supervisor still owned, as when it ignores SIGTERM.
export const abandonStuckSupervisor = async (): Promise<void> => {
  await spawnSupervisor();
  await vi.advanceTimersByTimeAsync(startLimitMs + stopLimitMs);
  expect(value()).toBe('failed');
};

export const released = { type: 'counts.released' } as const;

export const runningSessions = { running: 1, attention: 0 };

// The Server answers the App's question as it lets go.
export const serverSays = (enabled: boolean): void =>
  server.send({ type: 'keepRunning.changed', enabled });

// The Server never answers: the App waits out its release limit.
export const waitOutRelease = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(releaseLimitMs);
};
