import { describe, expect, it } from 'vitest';
import { writeJobs } from '../../storage';
import { TurnInsertJob } from '../session-storage/session-storage';
import {
  runningTurnId,
  messageRow,
  seedStoredFeedRows,
  toolRow,
} from './recovery-rows.test.mocks';
import {
  messages,
  readRows,
  readStoredRows,
  startEngine,
  interruptEngine,
  engineDatabase,
} from './recovery.test.mocks';

describe('Engine restart recovery', (): void => {
  it('rolls back every repair and fails without serving when a Session write fails', async (): Promise<void> => {
    const database = engineDatabase();
    writeJobs(database, [
      new TurnInsertJob({
        turn: { id: runningTurnId, sessionId: 'session-1', status: 'running' },
      }),
    ]);
    seedStoredFeedRows(database, {
      sessionId: 'session-1',
      maxRevision: 9,
      rows: [
        toolRow({ id: 'tool', position: 0, revision: 9, status: 'pending' }),
      ],
    });
    seedStoredFeedRows(database, {
      sessionId: 'session-2',
      maxRevision: 4,
      rows: [messageRow('message', 0, 4)],
    });
    database.$client.exec(`
      CREATE TRIGGER reject_recovery BEFORE UPDATE OF max_revision ON session
      WHEN NEW.id = 'session-2' BEGIN SELECT RAISE(ABORT, 'repair rejected'); END;
    `);
    const before = readRows(database);
    await interruptEngine();
    messages.length = 0;
    const failed = await startEngine();

    expect(failed.value).toBe('failed');
    expect(failed.output).toEqual({ exitCode: 1 });
    expect(failed.context.failure).toContain(
      'could not recover after restart:',
    );
    expect(messages).toEqual([]);
    expect(readStoredRows()).toEqual(before);
  });
});
