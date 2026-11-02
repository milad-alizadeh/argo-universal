import { describe, expect, it } from 'vitest';
import {
  abandonStuckSupervisor,
  serverSays,
  spawnSupervisor,
  startSupervisor,
  value,
} from './server-machine-timing.mocks';
import {
  latest,
  readAddressCalls,
  readStoredCalls,
  reportSpawned,
  retryServerEvent,
  server,
  settle,
  startServerMachine,
  startedAddress,
  stoppedPids,
} from './server-machine.mocks';

describe('quitting the App while its Supervisor starts', (): void => {
  it('leaves the Supervisor running when the stored setting is on', async (): Promise<void> => {
    await spawnSupervisor();

    server.send({ type: 'app.quit' });
    expect(value()).toBe('readingStoredOnQuit');
    expect(stoppedPids).toEqual([]);
    await settle((): void => latest(readStoredCalls).resolve(true));

    expect(value()).toBe('stopped');
    expect(stoppedPids).toEqual([]);
  });

  it.each([
    ['is off', (): void => latest(readStoredCalls).resolve(false)],
    [
      'cannot be read',
      (): void => latest(readStoredCalls).reject(new Error('unreadable')),
    ],
  ])(
    'stops the Supervisor when the stored setting %s',
    async (_, answer): Promise<void> => {
      await spawnSupervisor();
      server.send({ type: 'app.quit' });

      await settle(answer);

      expect(value()).toEqual({ stopping: 'waiting' });
      expect(stoppedPids).toEqual([startedAddress.pid]);
    },
  );

  it('does not let an answer from a lost Connection keep a Supervisor that is still starting', async (): Promise<void> => {
    await startSupervisor();
    serverSays(true);
    server.send({ type: retryServerEvent });
    await settle((): void => latest(readAddressCalls).resolve(null));
    reportSpawned();
    expect(value()).toEqual({ starting: { answering: 'waiting' } });

    server.send({ type: 'app.quit' });
    await settle((): void => latest(readStoredCalls).resolve(false));

    expect(value()).toEqual({ stopping: 'waiting' });
    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('reads nothing when no Supervisor was started yet', async (): Promise<void> => {
    startServerMachine();

    server.send({ type: 'app.quit' });

    expect(value()).toBe('stopped');
    expect(readStoredCalls).toHaveLength(0);
  });

  it('stops a Supervisor that failed to answer without asking the stored setting', async (): Promise<void> => {
    await abandonStuckSupervisor();

    server.send({ type: 'app.quit' });

    expect(readStoredCalls).toHaveLength(0);
    expect(stoppedPids).toContain(startedAddress.pid);
  });
});
