import { describe, expect, it } from 'vitest';
import { sentToCounts } from './server-machine-data.mocks';
import {
  released,
  runningSessions,
  serverSays,
  startSupervisor,
  value,
} from './server-machine-timing.mocks';
import {
  countsChangedEvent,
  latest,
  quitCalls,
  readStoredCalls,
  server,
  settle,
  startedAddress,
  stoppedPids,
} from './server-machine.mocks';
import { countsReleaseEvent } from './session-counts';

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
    serverSays(false);
    server.send(released);

    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('asks about running Sessions only once the Connection has closed', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: countsChangedEvent, counts: runningSessions });

    server.send({ type: 'app.quit' });
    serverSays(false);

    expect(quitCalls).toHaveLength(0);
    server.send(released);
    expect(value()).toEqual({ ready: 'confirming' });
  });

  it('leaves the Supervisor running when Keep answers the question', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: countsChangedEvent, counts: runningSessions });
    server.send({ type: 'app.quit' });
    serverSays(false);
    server.send(released);

    await settle((): void => latest(quitCalls).resolve(true));

    expect(value()).toBe('stopped');
    expect(stoppedPids).toEqual([]);
  });

  it('leaves the Supervisor running, and asks nothing, when the Server answers that it keeps running', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: countsChangedEvent, counts: runningSessions });

    server.send({ type: 'app.quit' });
    serverSays(true);
    server.send(released);

    expect(value()).toBe('stopped');
    expect(stoppedPids).toEqual([]);
    expect(quitCalls).toHaveLength(0);
  });

  it('stops the Supervisor as before when the Server answers that it does not keep running', async (): Promise<void> => {
    await startSupervisor();

    server.send({ type: 'app.quit' });
    serverSays(false);
    server.send(released);

    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('reads nothing off the disk when the Server answers', async (): Promise<void> => {
    await startSupervisor();

    server.send({ type: 'app.quit' });
    serverSays(true);
    server.send(released);

    expect(readStoredCalls).toHaveLength(0);
  });
});
