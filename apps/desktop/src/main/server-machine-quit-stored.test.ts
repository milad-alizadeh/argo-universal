import { describe, expect, it } from 'vitest';
import {
  released,
  runningSessions,
  serverSays,
  startSupervisor,
  value,
  waitOutRelease,
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

const readingStored = { ready: 'readingStored' };

describe('quitting the App with no answer from the Server', (): void => {
  it('reads the setting stored on disk, from the home the App uses, only once it is quitting', async (): Promise<void> => {
    await startSupervisor();
    expect(readStoredCalls).toHaveLength(0);

    server.send({ type: 'app.quit' });
    server.send(released);

    expect(value()).toEqual(readingStored);
    expect(readStoredCalls).toHaveLength(1);
    expect(latest(readStoredCalls).input.home).toBe('/unused');
  });

  it('leaves the Supervisor running when the Connection closes and the stored setting is on', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: 'app.quit' });
    server.send(released);

    await settle((): void => latest(readStoredCalls).resolve(true));

    expect(value()).toBe('stopped');
    expect(stoppedPids).toEqual([]);
  });

  it('leaves the Supervisor running when the Server never answers and the stored setting is on', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: 'app.quit' });
    await waitOutRelease();

    await settle((): void => latest(readStoredCalls).resolve(true));

    expect(value()).toBe('stopped');
    expect(stoppedPids).toEqual([]);
  });

  it('asks nothing about running Sessions when the stored setting is on', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: countsChangedEvent, counts: runningSessions });
    server.send({ type: 'app.quit' });
    server.send(released);

    await settle((): void => latest(readStoredCalls).resolve(true));

    expect(value()).toBe('stopped');
    expect(quitCalls).toHaveLength(0);
  });

  it('stops the Supervisor when the stored setting is off', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: 'app.quit' });
    await waitOutRelease();

    await settle((): void => latest(readStoredCalls).resolve(false));

    expect(value()).toEqual({ stopping: 'waiting' });
    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('asks about running Sessions when the stored setting is off', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: countsChangedEvent, counts: runningSessions });
    server.send({ type: 'app.quit' });
    server.send(released);

    await settle((): void => latest(readStoredCalls).resolve(false));

    expect(value()).toEqual({ ready: 'confirming' });
    expect(stoppedPids).toEqual([]);
  });

  it('stops the Supervisor when the stored setting cannot be read', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: 'app.quit' });
    server.send(released);

    await settle((): void =>
      latest(readStoredCalls).reject(new Error('database is locked')),
    );

    expect(value()).toEqual({ stopping: 'waiting' });
    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('does not let an answer heard earlier keep a Server whose stored setting is off', async (): Promise<void> => {
    await startSupervisor();
    serverSays(true);

    server.send({ type: 'app.quit' });
    await waitOutRelease();
    await settle((): void => latest(readStoredCalls).resolve(false));

    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('lets the answer of the Server win over the stored setting', async (): Promise<void> => {
    await startSupervisor();

    server.send({ type: 'app.quit' });
    serverSays(false);
    server.send(released);

    expect(readStoredCalls).toHaveLength(0);
    expect(stoppedPids).toEqual([startedAddress.pid]);
  });

  it('waits for the stored setting once, however often the App is asked to quit', async (): Promise<void> => {
    await startSupervisor();
    server.send({ type: 'app.quit' });
    server.send(released);

    server.send({ type: 'app.quit' });

    expect(value()).toEqual(readingStored);
    expect(readStoredCalls).toHaveLength(1);
    expect(stoppedPids).toEqual([]);
  });
});
