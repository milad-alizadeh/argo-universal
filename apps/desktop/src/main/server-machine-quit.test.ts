import { describe, expect, it, vi } from 'vitest';
import { sentToCounts } from './server-machine-data.mocks';
import { startSupervisor, value } from './server-machine-timing.mocks';
import {
  countsChangedEvent,
  latest,
  quitCalls,
  readAddressCalls,
  reportSpawned,
  retryServerEvent,
  server,
  settle,
  startedAddress,
  stoppedPids,
} from './server-machine.mocks';
import { countsReleaseEvent, releaseLimitMs } from './session-counts';

const released = { type: 'counts.released' } as const;

const keepRunningChanged = 'keepRunning.changed';

const runningSessions = { running: 1, attention: 0 };

describe('quitting the App', (): void => {
  it('tells the Server Connection to let go before it quits', async (): Promise<void> => {
    await startSupervisor();

    server.send({ type: 'app.quit' });

    expect(value()).toEqual({ ready: 'releasing' });
    expect(sentToCounts).toEqual([countsReleaseEvent]);
    expect(server.getSnapshot().status).toBe('active');
  });

  it('quits once the Server Connection has closed', async (): Promise<void> => {
    await startSupervisor();

    server.send({ type: 'app.quit' });
    server.send(released);

    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('quits anyway when the Server Connection does not close', async (): Promise<void> => {
    await startSupervisor();

    server.send({ type: 'app.quit' });
    await vi.advanceTimersByTimeAsync(releaseLimitMs);

    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('asks about running Sessions only once the Connection has closed', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: countsChangedEvent, counts: runningSessions });

    server.send({ type: 'app.quit' });

    expect(quitCalls).toHaveLength(0);
    server.send(released);
    expect(value()).toEqual({ ready: 'confirming' });
  });

  it('leaves the Supervisor running when Keep answers the question', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: countsChangedEvent, counts: runningSessions });
    server.send({ type: 'app.quit' });
    server.send(released);

    await settle((): void => latest(quitCalls).resolve(true));

    expect(value()).toBe('stopped');
    expect(stoppedPids).toEqual([]);
  });

  it('leaves the Supervisor running, and asks nothing, when the Server is set to keep running', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: countsChangedEvent, counts: runningSessions });
    server.send({ type: keepRunningChanged, enabled: true });

    server.send({ type: 'app.quit' });
    server.send(released);

    expect(value()).toBe('stopped');
    expect(stoppedPids).toEqual([]);
    expect(quitCalls).toHaveLength(0);
  });

  it('stops the Supervisor as before when the Server is set not to keep running', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: keepRunningChanged, enabled: true });
    server.send({ type: keepRunningChanged, enabled: false });

    server.send({ type: 'app.quit' });
    server.send(released);

    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('leaves a Supervisor it is still starting running, once the Server has said to keep it', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: keepRunningChanged, enabled: true });
    server.send({ type: retryServerEvent });
    await settle((): void => latest(readAddressCalls).resolve(null));
    reportSpawned();
    expect(value()).toEqual({ starting: { answering: 'waiting' } });

    server.send({ type: 'app.quit' });

    expect(value()).toBe('stopped');
    expect(stoppedPids).toEqual([]);
  });
});
