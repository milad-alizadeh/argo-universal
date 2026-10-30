import { expect } from 'vitest';
import {
  failures,
  latest,
  readyAddresses,
  runningAddress,
  server,
  type ServerSnapshot,
  stoppedPids,
  spawnCalls,
  staleAddress,
  startedAddress,
} from './server-machine.mocks';

// Checked after every step of every path.
export const always = (snapshot: ServerSnapshot): void => {
  const actual = server.getSnapshot();
  expect(actual.value).toEqual(snapshot.value);
  expect(actual.status).toBe(snapshot.status);
  expect(actual.context.address).toEqual(snapshot.context.address);
  expect(actual.context.ownedPid).toBe(snapshot.context.ownedPid);
  expect(actual.context.running).toBe(snapshot.context.running);

  expect(actual.context.failure === null).toBe(
    snapshot.context.failure === null,
  );
  // A Supervisor that this app did not start is never stopped.
  expect(stoppedPids).not.toContain(runningAddress.pid);
  // Only `starting` listens to the Supervisor it spawned.
  expect(spawnCalls.filter((call): boolean => call.live)).toHaveLength(
    snapshot.matches('starting') ? 1 : 0,
  );
};

export const states = {
  ready: (snapshot: ServerSnapshot): void => {
    // Try again from `ready` leads back to it, so each entry hands the main process the address it holds, never a stale one.
    expect(latest(readyAddresses)).toEqual(snapshot.context.address);
    expect(snapshot.context.address).not.toEqual(staleAddress);
  },
  failed: (snapshot: ServerSnapshot): void => {
    expect(snapshot.context.failure).not.toBeNull();
    // A failure can now follow a Try again from `ready`, so each entry announces the failure it holds.
    expect(latest(failures)).toBe(snapshot.context.failure);
  },
  abandoning: (): void => {
    expect(latest(stoppedPids)).toBe(startedAddress.pid);
  },
  retrying: (): void => {
    expect(latest(stoppedPids)).toBe(startedAddress.pid);
  },
  stopping: (): void => {
    expect(latest(stoppedPids)).toBe(startedAddress.pid);
  },
  stopped: (): void => {
    expect(server.getSnapshot().status).toBe('done');
  },
};
