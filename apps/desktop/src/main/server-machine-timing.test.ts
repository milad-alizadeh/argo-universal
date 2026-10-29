import { pollIntervalMs, startLimitMs, stopLimitMs } from '@repo/process';
import { describe, expect, it, vi } from 'vitest';
import {
  abandonStuckSupervisor,
  context,
  spawnSupervisor,
  value,
} from './server-machine-timing.mocks';
import {
  exitReason,
  failures,
  latest,
  readAddressCalls,
  readyAddresses,
  reportExited,
  retryServerEvent,
  runningAddress,
  server,
  settle,
  stoppedPids,
  staleAddress,
  supervisorExitedEvent,
  supervisorSpawnedEvent,
  startedAddress,
} from './server-machine.mocks';

// The exact timing of each delay.
describe('server connection', (): void => {
  it('accepts delayed Supervisor pid reporting after its start time', async (): Promise<void> => {
    await spawnSupervisor();
    const address = { ...startedAddress, pid: 201 };
    server.send({
      type: supervisorSpawnedEvent,
      pid: address.pid,
      at: Date.parse('2026-10-03T10:01:00.000Z'),
    });
    await vi.advanceTimersByTimeAsync(pollIntervalMs);
    await settle((): void => latest(readAddressCalls).resolve(address));
    expect(readyAddresses).toEqual([address]);
  });

  it('announces each Server startup failure once', async (): Promise<void> => {
    await abandonStuckSupervisor();
    expect(failures).toEqual([context().failure]);
    server.send({ type: supervisorExitedEvent, reason: 'Late exit' });
    expect(failures).toHaveLength(1);
    server.send({ type: retryServerEvent });
    await vi.advanceTimersByTimeAsync(stopLimitMs);
    expect(failures).toHaveLength(2);
    expect(failures[1]).toBe(context().failure);
  });

  it('reads server.json every poll delay until it names the spawned Supervisor', async (): Promise<void> => {
    await spawnSupervisor();
    expect(readAddressCalls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(pollIntervalMs - 1);
    expect(readAddressCalls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(readAddressCalls).toHaveLength(2);
    // server.json still names an older Supervisor.
    await settle((): void => latest(readAddressCalls).resolve(runningAddress));
    await vi.advanceTimersByTimeAsync(pollIntervalMs);
    // server.json was written before the spawn, by a process whose pid the OS reused.
    await settle((): void => latest(readAddressCalls).resolve(staleAddress));
    await vi.advanceTimersByTimeAsync(pollIntervalMs);
    expect(readAddressCalls).toHaveLength(4);
    await settle((): void => latest(readAddressCalls).resolve(startedAddress));

    expect(value()).toEqual({ ready: 'active' });
    expect(readyAddresses).toEqual([startedAddress]);
  });

  it('abandons a Supervisor that does not answer in 30 seconds', async (): Promise<void> => {
    await spawnSupervisor();

    await vi.advanceTimersByTimeAsync(startLimitMs - 1);
    expect(value()).toEqual({ starting: { answering: 'checking' } });
    await vi.advanceTimersByTimeAsync(1);

    expect(value()).toEqual({ abandoning: 'waiting' });
    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('reuses the Supervisor that won the race to start when its own exits', async (): Promise<void> => {
    await spawnSupervisor();

    reportExited();
    await settle((): void => latest(readAddressCalls).resolve(runningAddress));

    expect(value()).toEqual({ ready: 'active' });
    expect(context()).toEqual(
      expect.objectContaining({ ownedPid: null, failure: null }),
    );
    expect(readyAddresses).toEqual([runningAddress]);
  });

  it('fails when its Supervisor exits and no other runs', async (): Promise<void> => {
    await spawnSupervisor();

    reportExited();
    await settle((): void => latest(readAddressCalls).resolve(null));

    expect(value()).toBe('failed');
    expect(context().failure).toBe(exitReason);
    expect(stoppedPids).toEqual([]);
  });
});
