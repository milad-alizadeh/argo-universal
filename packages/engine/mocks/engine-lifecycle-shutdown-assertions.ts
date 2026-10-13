import { expect } from 'vitest';
import { type EngineSnapshot } from './engine-lifecycle-actors';
import { expectModelState, expectExit } from './engine-lifecycle-assertions';
import {
  stopAllSessionsEvent,
  drainWriterEvent,
} from './engine-lifecycle-input';
import { record } from './engine-lifecycle-record';
export const shutdownStates: Record<
  string,
  (snapshot: EngineSnapshot) => void
> = {
  'live.stopping.closingHttp': (snapshot): void => {
    expectModelState(snapshot);
    expect(record.closeHttpServerCalls).toEqual([
      expect.objectContaining({ input: { server: snapshot.context.server } }),
    ]);
    expect(record.databaseCloses).toBe(0);
    expect(record.shutdownCommands).toEqual([]);
    expect(record.engine.system.get('sessions')).toBeDefined();
    expect(record.engine.system.get('databaseWriter')).toBeDefined();
  },
  'live.stopping.stoppingSessions': (snapshot): void => {
    expectModelState(snapshot);
    expect(record.shutdownCommands).toEqual([stopAllSessionsEvent]);
    expect(record.databaseCloses).toBe(0);
    expect(record.engine.system.get('databaseWriter')).toBeDefined();
  },
  'live.stopping.drainingWriter': (snapshot): void => {
    expectModelState(snapshot);
    expect(record.shutdownCommands).toEqual([
      stopAllSessionsEvent,
      drainWriterEvent,
    ]);
    expect(record.databaseCloses).toBe(0);
  },
  'live.stopping.closingAgents': (snapshot): void => {
    expectModelState(snapshot);
    expect(record.databaseCloses).toBe(0);
    expect(record.shutdownCommands).toEqual([stopAllSessionsEvent]);
  },
  'live.stopping.retainingAgentCleanup': (snapshot): void => {
    expectModelState(snapshot);
    expect(record.databaseCloses).toBe(0);
    expect(record.shutdownCommands).toEqual([stopAllSessionsEvent]);
    expect(snapshot.context.failure).toContain('cleanup remains unresolved');
  },
  stopped: (snapshot): void => expectExit(snapshot, 0),
  failed: (snapshot): void => expectExit(snapshot, 1),
};
