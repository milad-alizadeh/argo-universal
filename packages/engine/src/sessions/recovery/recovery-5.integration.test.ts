import { feedRow } from '@repo/db/schema';
import { sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { storedFeedColumns } from '../../feed';
import { recoverAfterRestart } from '../recovery';
import { toolRow } from './recovery-rows.test.mocks';

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
