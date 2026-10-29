import { feedRow, session } from '@repo/db/schema';
import { describe, expect, it } from 'vitest';
import { expectedTool } from './recovery-expect.test.mocks';
import {
  runningTurnId,
  partialReply,
  completedToolId,
  failedToolId,
  cancelledToolId,
  settledCompletedToolId,
  settledRunningToolId,
  messageRow,
} from './recovery-rows.test.mocks';
import { seedInterruptedTurn } from './recovery-seed.test.mocks';
import {
  messages,
  rowsAtReady,
  readRows,
  startEngine,
  interruptEngine,
  readyRows,
  engineDatabase,
} from './recovery.test.mocks';

describe('Engine restart recovery', (): void => {
  it('repairs an interrupted Turn and its Feed before reporting ready', async (): Promise<void> => {
    const database = engineDatabase();
    seedInterruptedTurn(database);
    const unchangedTurn = readRows(database).turns[0];
    const unchangedRow = readRows(database).rows[7];
    const interruptedAt = Date.now();
    await interruptEngine();
    messages.length = 0;
    rowsAtReady.length = 0;
    await startEngine();

    const repaired = readyRows();
    expect(repaired.turns[0]).toEqual(unchangedTurn);
    expect(repaired.turns[1]).toMatchObject({
      status: 'ended',
      stopReason: 'error',
      endedAt: expect.any(Number),
    });
    expect(repaired.turns[1]?.endedAt).toBeGreaterThanOrEqual(interruptedAt);
    expect(repaired.turns[1]?.endedAt).toBeLessThanOrEqual(Date.now());
    expect(
      repaired.rows
        .filter((row) => row.id !== `${runningTurnId}:end`)
        .map(
          ({
            id,
            state,
            revision,
            payload,
          }): Pick<
            typeof feedRow.$inferSelect,
            'id' | 'state' | 'revision' | 'payload'
          > => ({
            id,
            state,
            revision,
            payload,
          }),
        ),
    ).toEqual([
      expect.objectContaining({
        id: 'message',
        state: 'settled',
        revision: 21,
        payload: messageRow('message', 0, 2).payload,
      }),
      ...[
        'pending-tool',
        'running-tool',
        completedToolId,
        failedToolId,
        cancelledToolId,
        'settled-pending-tool',
      ].map(expectedTool),
      expect.objectContaining({
        id: settledCompletedToolId,
        state: 'settled',
        revision: 16,
      }),
      expect.objectContaining({
        id: settledRunningToolId,
        state: 'settled',
        revision: 28,
        payload: expect.objectContaining({ status: 'cancelled' }),
      }),
      expect.objectContaining({ id: 'message', state: 'settled', revision: 6 }),
    ]);
    expect(
      repaired.rows.find((row) => row.id === `${runningTurnId}:end`),
    ).toMatchObject({
      sessionUpdate: 'notice',
      state: 'settled',
      revision: 29,
      position: 9,
      turnId: runningTurnId,
      payload: {
        _meta: {
          argo: {
            turnEnd: {
              stopReason: 'error',
              error: {
                code: 'interrupted',
                message: 'The Server stopped during the Turn',
              },
              durationMs: expect.any(Number),
            },
          },
        },
      },
    });
    expect(repaired.rows[7]).toEqual(unchangedRow);
    expect(repaired.rows[0]).toMatchObject({
      position: 0,
      turnId: runningTurnId,
      sourceRef: { line: 7 },
      searchText: partialReply,
    });
    expect(
      repaired.sessions.map(
        ({
          maxRevision,
          epoch,
        }): Pick<typeof session.$inferSelect, 'maxRevision' | 'epoch'> => ({
          maxRevision,
          epoch,
        }),
      ),
    ).toEqual([
      { maxRevision: 29, epoch: 3 },
      { maxRevision: 6, epoch: 3 },
    ]);

    await interruptEngine();
    await startEngine();
    expect(rowsAtReady.at(-1)).toEqual(repaired);
  });
});
