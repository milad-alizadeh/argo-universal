import { expect } from 'vitest';
import { latest } from './engine-model-executors';
import {
  stopAllSessionsEvent,
  drainWriterEvent,
  input,
} from './engine-model-fixtures';
import { expectListeningOptions } from './engine-model-listening';
import { type EngineSnapshot } from './engine-model-logic';
import * as model from './engine-model-state';

const expectModelState = (expected: EngineSnapshot): void => {
  const actual = model.engine.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.context.database).toBe(
    expected.context.database === null ? null : model.mockDatabase,
  );
  expect(actual.context.server).toBe(expected.context.server);
  expect(actual.context.failure).toBe(expected.context.failure);
};

// Final states close the database they opened, stop listening for signals, and exit with a code.
const expectExit = (snapshot: EngineSnapshot, exitCode: number): void => {
  expectModelState(snapshot);
  expect(model.engine.getSnapshot().output).toEqual({ exitCode });
  expect(model.databaseCloses).toBe(snapshot.context.database === null ? 0 : 1);
  expect(model.processSignals.live).toBe(false);
};

interface HeartbeatMessage {
  type: 'heartbeat';
}

type EngineStatePath =
  | 'openingDatabase'
  | 'recovering'
  | 'live.listening'
  | 'live.running'
  | 'live.stopping.closingHttp'
  | 'live.stopping.stoppingSessions'
  | 'live.stopping.drainingWriter'
  | 'live.stopping.closingAgents'
  | 'live.stopping.retainingAgentCleanup'
  | 'stopped'
  | 'failed';

export const states: Record<
  EngineStatePath,
  (snapshot: EngineSnapshot) => void
> = {
  openingDatabase: (snapshot): void => {
    expectModelState(snapshot);
    expect(model.openDatabaseCalls).toEqual([
      expect.objectContaining({ input: { home: input.home } }),
    ]);
    expect(model.startHttpServerCalls).toEqual([]);
    expect(model.messages).toEqual([]);
    expect(model.processSignals.live).toBe(true);
  },
  recovering: (snapshot): void => {
    expectModelState(snapshot);
    expect(model.recoveryCalls).toEqual([
      expect.objectContaining({
        input: {
          database: model.mockDatabase,
          blobsFolder: '/unused/blobs',
          home: input.home,
        },
      }),
    ]);
    expect(model.startHttpServerCalls).toEqual([]);
    expect(model.messages).toEqual([]);
    expect(model.databaseCloses).toBe(0);
  },
  'live.listening': (snapshot): void => {
    expectModelState(snapshot);
    const sessions = latest(model.startHttpServerCalls).input.sessions;
    expect(sessions.getSnapshot().context.now).toBe(input.now);
    expect(sessions.getSnapshot().context.createId).toBe(input.createId);
    expect(
      model.engine.getSnapshot().children.databaseWriter?.getSnapshot(),
    ).toMatchObject({
      context: { now: input.now },
    });
    expectListeningOptions();
    expect(model.messages).toEqual([]);
  },
  'live.running': (snapshot): void => {
    expectModelState(snapshot);
    expect(model.messages[0]).toEqual({ type: 'ready', port: 7337 });
    expect(model.messages.slice(1)).toEqual(
      model.messages
        .slice(1)
        .map((): HeartbeatMessage => ({ type: 'heartbeat' })),
    );
    expect(model.databaseCloses).toBe(0);
  },
  'live.stopping.closingHttp': (snapshot): void => {
    expectModelState(snapshot);
    expect(model.closeHttpServerCalls).toEqual([
      expect.objectContaining({ input: { server: snapshot.context.server } }),
    ]);
    expect(model.databaseCloses).toBe(0);
    expect(model.shutdownCommands).toEqual([]);
    expect(model.engine.system.get('sessions')).toBeDefined();
    expect(model.engine.system.get('databaseWriter')).toBeDefined();
  },
  'live.stopping.stoppingSessions': (snapshot): void => {
    expectModelState(snapshot);
    expect(model.shutdownCommands).toEqual([stopAllSessionsEvent]);
    expect(model.databaseCloses).toBe(0);
    expect(model.engine.system.get('databaseWriter')).toBeDefined();
  },
  'live.stopping.drainingWriter': (snapshot): void => {
    expectModelState(snapshot);
    expect(model.shutdownCommands).toEqual([
      stopAllSessionsEvent,
      drainWriterEvent,
    ]);
    expect(model.databaseCloses).toBe(0);
  },
  'live.stopping.closingAgents': (snapshot): void => {
    expectModelState(snapshot);
    expect(model.databaseCloses).toBe(0);
    expect(model.shutdownCommands).toEqual([stopAllSessionsEvent]);
  },
  'live.stopping.retainingAgentCleanup': (snapshot): void => {
    expectModelState(snapshot);
    expect(model.databaseCloses).toBe(0);
    expect(model.shutdownCommands).toEqual([stopAllSessionsEvent]);
    expect(snapshot.context.failure).toContain('cleanup remains unresolved');
  },
  stopped: (snapshot): void => expectExit(snapshot, 0),
  failed: (snapshot): void => expectExit(snapshot, 1),
};
