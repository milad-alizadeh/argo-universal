import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { feedRow, session, blob, blobRef } from '@repo/db/schema';
import { sql } from 'drizzle-orm';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { storedFeedColumns } from '../../feed';
import { recoverAfterRestart } from '../recovery';
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
  toolRow,
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
  home,
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
                message: 'The Server restarted during this Turn',
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

  it('deletes blobs no prompt refers to once they are over a day old', async (): Promise<void> => {
    const database = engineDatabase();
    const blobsFolder = join(home, 'blobs');
    mkdirSync(blobsFolder);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const [id, createdAt] of [
      ['old-unused', dayAgo - 60_000],
      ['old-used', dayAgo - 60_000],
      ['new-unused', Date.now()],
    ] as const) {
      writeFileSync(join(blobsFolder, id), id);
      database
        .insert(blob)
        .values({ id, mime: 'image/png', bytes: 2, createdAt })
        .run();
    }

    database
      .insert(blobRef)
      .values({ blobId: 'old-used', sessionId: 'session-1' })
      .run();
    await interruptEngine();
    await startEngine();

    expect(readdirSync(blobsFolder).sort()).toEqual(['new-unused', 'old-used']);
  });
});

it.each(
  (['open', 'settled'] as const).flatMap(
    (
      state,
    ): [
      {
        state: 'open' | 'settled';
        column: typeof feedRow.payload;
        field: string;
      },
      {
        state: 'open' | 'settled';
        column: typeof feedRow.sourceRef;
        field: string;
      },
    ] => [
      { state, column: feedRow.payload, field: 'payload' },
      { state, column: feedRow.sourceRef, field: 'source reference' },
    ],
  ),
)(
  'keeps recovery available with unreadable $field JSON on a $state row',
  ({ state, column }): void => {
    const { database, remove } = openTestDatabase();
    onTestFinished(remove);

    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});

    onTestFinished((): void => reported.mockRestore());
    database
      .insert(feedRow)
      .values({
        ...toolRow({
          id: 'bad-json',
          position: 0,
          revision: 1,
          status: 'in_progress',
          state,
        }),
        sessionId: 'session-1',
      })
      .run();
    database.run(
      sql`update ${feedRow} set ${sql.identifier(column.name)} = 'broken-json' where ${feedRow.id} = 'bad-json'`,
    );
    expect((): void => recoverAfterRestart(database)).not.toThrow();
    const repaired = database.select(storedFeedColumns).from(feedRow).get();
    expect(repaired).toMatchObject({
      id: 'bad-json',
      state: 'settled',
      revision: 1,
    });
    expect(repaired).toMatchObject(
      column === feedRow.payload
        ? { payload: 'broken-json' }
        : { sourceRef: 'broken-json' },
    );
    expect(reported).toHaveBeenCalledWith(
      'recovery: rejected Feed shape (session-1/bad-json) #1',
      expect.anything(),
    );
  },
);
