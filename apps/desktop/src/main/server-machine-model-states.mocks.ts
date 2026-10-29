import { expect } from 'vitest';
import {
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

export const states = {
  '*': (snapshot: ServerSnapshot): void => {
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
  },
  ready: (snapshot: ServerSnapshot): void => {
    // `ready` hands its address to the main process once, never a stale one.
    expect(readyAddresses).toEqual([snapshot.context.address]);
    expect(snapshot.context.address).not.toEqual(staleAddress);
  },
  failed: (snapshot: ServerSnapshot): void => {
    expect(snapshot.context.failure).not.toBeNull();
    expect(readyAddresses).toEqual([]);
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
