import { expect } from 'vitest';
import { type EngineSnapshot } from './engine-lifecycle-actors';
import { expectModelState } from './engine-lifecycle-assertions';
import { input } from './engine-lifecycle-input';
import { record } from './engine-lifecycle-record';
export const startupStates: Record<string, (snapshot: EngineSnapshot) => void> =
  {
    openingDatabase: (snapshot): void => {
      expectModelState(snapshot);
      expect(record.openDatabaseCalls).toEqual([
        expect.objectContaining({ input: { home: input.home } }),
      ]);
      expect(record.startHttpServerCalls).toEqual([]);
      expect(record.messages).toEqual([]);
      expect(record.processSignals.live).toBe(true);
    },
    recovering: (snapshot): void => {
      expectModelState(snapshot);
      expect(record.recoveryCalls).toEqual([
        expect.objectContaining({
          input: {
            database: record.mockDatabase,
            blobsFolder: '/unused/blobs',
            home: input.home,
          },
        }),
      ]);
      expect(record.startHttpServerCalls).toEqual([]);
      expect(record.messages).toEqual([]);
      expect(record.databaseCloses).toBe(0);
    },
    'live.listening': (snapshot): void => {
      expectModelState(snapshot);
      expectSessionInput();
      expectWriterInput();
      expect(record.startHttpServerCalls).toEqual([
        expect.objectContaining({ input: expectedServerInput(snapshot) }),
      ]);
      expect(record.messages).toEqual([]);
    },
    'live.running': (snapshot): void => {
      expectModelState(snapshot);
      expect(record.messages[0]).toEqual({ type: 'ready', port: 7337 });
      expect(record.messages.slice(1)).toEqual(
        record.messages
          .slice(1)
          .map((): { type: string } => ({ type: 'heartbeat' })),
      );
      expect(record.databaseCloses).toBe(0);
    },
  };

function expectSessionInput(): void {
  const call = record.startHttpServerCalls[0];
  if (!call) throw new Error('HTTP Server was not started');
  const context = call.input.sessions.getSnapshot().context;
  expect(context.now).toBe(input.now);
  expect(context.createId).toBe(input.createId);
}
function expectWriterInput(): void {
  expect(
    record.engine.getSnapshot().children.databaseWriter?.getSnapshot(),
  ).toMatchObject({ context: { now: input.now } });
}
const serverInput = {
  createId: input.createId,
  home: input.home,
  port: 7337,
  version: '1.2.3',
  startedAt: input.startedAt,
  sessions: expect.anything(),
  databaseWriter: expect.anything(),
  syncSupervisor: expect.anything(),
  commandAdmission: expect.any(AbortController),
  acp: undefined,
  loginTimeoutMs: undefined,
  loginCleanupTimeoutMs: undefined,
};
function expectedServerInput(snapshot: EngineSnapshot): object {
  return {
    ...serverInput,
    installations: snapshot.context.installations,
    database: record.mockDatabase,
  };
}
