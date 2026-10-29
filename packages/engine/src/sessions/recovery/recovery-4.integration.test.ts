import { feedRow } from '@repo/db/schema';
import { describe, expect, it, vi } from 'vitest';
import { writeJobs } from '../../storage';
import { TurnInsertJob } from '../session-storage/session-storage';
import {
  runningTurnId,
  editedFilePath,
  invalidMessageId,
  futurePayloadId,
  messageRow,
  seedStoredFeedRows,
  toolRow,
} from './recovery-rows.test.mocks';
import {
  messages,
  rowsAtReady,
  startEngine,
  interruptEngine,
  readyRows,
  engineDatabase,
} from './recovery.test.mocks';

describe('Engine restart recovery', (): void => {
  it('settles and counts unrecognised Feed payloads before serving', async (): Promise<void> => {
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
        messageRow('valid-message', 0, 1),
        {
          ...messageRow(invalidMessageId, 1, 2),
          payload: { messageId: invalidMessageId, content: 'not an array' },
        },
        {
          ...toolRow({
            id: 'other-turn-tool',
            position: 2,
            revision: 3,
            status: 'in_progress',
          }),
          turnId: 'other-turn',
        },
        messageRow('later-message', 3, 4),
        { ...messageRow('unscoped-message', 4, 5), turnId: null },
      ],
    });
    seedStoredFeedRows(database, {
      sessionId: 'session-2',
      maxRevision: 4,
      rows: [
        {
          ...toolRow({
            id: futurePayloadId,
            position: 0,
            revision: 4,
            status: 'in_progress',
            state: 'settled',
          }),
          payloadVersion: 2,
        },
      ],
    });

    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});

    try {
      await interruptEngine();
      messages.length = 0;
      rowsAtReady.length = 0;
      const restarted = await startEngine();
      expect(restarted.context.server).not.toBeNull();
      expect(restarted.context.failure).toBeNull();
      expect(messages).toContainEqual(
        expect.objectContaining({ type: 'ready' }),
      );

      const repaired = readyRows();

      expect(
        repaired.rows.map(
          ({
            id,
            revision,
            state,
          }): Pick<
            typeof feedRow.$inferSelect,
            'id' | 'state' | 'revision'
          > => ({
            id,
            revision,
            state,
          }),
        ),
      ).toEqual([
        { id: 'valid-message', revision: 10, state: 'settled' },
        { id: invalidMessageId, revision: 11, state: 'settled' },
        { id: 'other-turn-tool', revision: 12, state: 'settled' },
        { id: 'later-message', revision: 13, state: 'settled' },
        { id: 'unscoped-message', revision: 14, state: 'settled' },
        { id: `${runningTurnId}:end`, revision: 15, state: 'settled' },
        { id: futurePayloadId, revision: 5, state: 'settled' },
      ]);
      expect(repaired.rows[1]?.payload).toEqual({
        messageId: invalidMessageId,
        content: 'not an array',
      });
      expect(repaired.rows[2]?.payload).toMatchObject({ status: 'cancelled' });
      expect(
        repaired.rows.find((row) => row.id === futurePayloadId),
      ).toMatchObject({
        payloadVersion: 2,
        payload: { status: 'in_progress', rawInput: { path: editedFilePath } },
      });
      expect(repaired.turns[0]).toMatchObject({
        status: 'ended',
        error: { code: 'interrupted' },
      });
      expect(
        repaired.sessions.map(({ maxRevision }): number => maxRevision),
      ).toEqual([15, 5]);
      expect(reported).toHaveBeenCalledWith(
        'recovery: rejected Feed shape (session-1/invalid-message) #1',
        expect.anything(),
      );
      expect(reported).toHaveBeenCalledWith(
        'recovery: rejected Feed shape (session-2/future-payload) #2',
        expect.anything(),
      );
    } finally {
      reported.mockRestore();
    }
  });
});
