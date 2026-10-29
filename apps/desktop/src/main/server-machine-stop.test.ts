import { pollIntervalMs, startLimitMs, stopLimitMs } from '@repo/process';
import { describe, expect, it, vi } from 'vitest';
import {
  abandonStuckSupervisor,
  context,
  spawnSupervisor,
  startSupervisor,
  value,
} from './server-machine-timing.mocks';
import {
  checkRunningCalls,
  latest,
  retryServerEvent,
  server,
  settle,
  stoppedPids,
  spawnCalls,
  startedAddress,
} from './server-machine.mocks';

describe('server connection', (): void => {
  it('gives up abandoning after 5 seconds, and keeps the pid', async (): Promise<void> => {
    await spawnSupervisor();
    await vi.advanceTimersByTimeAsync(startLimitMs);

    await vi.advanceTimersByTimeAsync(pollIntervalMs);
    await settle((): void => latest(checkRunningCalls).resolve(true));
    await vi.advanceTimersByTimeAsync(stopLimitMs - pollIntervalMs - 1);
    expect(value()).toEqual({ abandoning: 'checking' });
    await vi.advanceTimersByTimeAsync(1);

    expect(value()).toBe('failed');
    expect(context().ownedPid).toBe(startedAddress.pid);
  });

  it('stops the last Supervisor on Retry before it starts over', async (): Promise<void> => {
    await abandonStuckSupervisor();

    server.send({ type: retryServerEvent });
    expect(stoppedPids).toEqual([startedAddress.pid, startedAddress.pid]);
    await vi.advanceTimersByTimeAsync(pollIntervalMs);
    await settle((): void => latest(checkRunningCalls).resolve(false));

    expect(value()).toBe('locating');
    expect(context()).toEqual(
      expect.objectContaining({ ownedPid: null, failure: null }),
    );
  });

  it('fails Retry again, spawning nothing, while the last Supervisor does not stop', async (): Promise<void> => {
    await abandonStuckSupervisor();

    server.send({ type: retryServerEvent });
    await vi.advanceTimersByTimeAsync(stopLimitMs);

    expect(value()).toBe('failed');
    expect(context().ownedPid).toBe(startedAddress.pid);
    expect(spawnCalls).toHaveLength(1);
  });

  it('waits 5 seconds at most for the Supervisor it started to stop on quit', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: 'app.quit' });
    expect(stoppedPids).toEqual([startedAddress.pid]);

    await vi.advanceTimersByTimeAsync(pollIntervalMs);
    await settle((): void => latest(checkRunningCalls).resolve(true));
    await vi.advanceTimersByTimeAsync(stopLimitMs - pollIntervalMs - 1);
    expect(value()).toEqual({ stopping: 'checking' });
    await vi.advanceTimersByTimeAsync(1);

    expect(server.getSnapshot().status).toBe('done');
  });

  it('quits as soon as the Supervisor it started exits', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: 'app.quit' });

    await vi.advanceTimersByTimeAsync(pollIntervalMs);
    await settle((): void => latest(checkRunningCalls).resolve(false));

    expect(server.getSnapshot().status).toBe('done');
    expect(context().ownedPid).toBeNull();
  });
});
