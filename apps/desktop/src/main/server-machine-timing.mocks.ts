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

// Reaches `failed` with the spawned Supervisor still owned, as when it ignores SIGTERM.
export const abandonStuckSupervisor = async (): Promise<void> => {
  await spawnSupervisor();
  await vi.advanceTimersByTimeAsync(startLimitMs + stopLimitMs);
  expect(value()).toBe('failed');
};
