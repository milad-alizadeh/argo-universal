import { turn } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import {
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

it('uses the newest Turn for failures and excludes interrupted Turns from Failed', async (): Promise<void> => {
  const { database, remove } = openTestDatabase({ maxRevision: 2 });
  insertEndedTurn(database);
  onTestFinished(remove);
  insertSession(database, { id: 'interrupted', maxRevision: 2 });
  insertEndedTurn(database, 'interrupted');
  insertSession(database, { id: 'recovered', maxRevision: 2 });
  insertEndedTurn(database, 'recovered');
  insertSession(database, { id: 'gave-up', failure: 'Repeated crashes' });
  insertEndedTurn(database, 'gave-up');
  database
    .insert(turn)
    .values([
      {
        id: 'failed',
        sessionId: 'session-1',
        status: 'ended',
        stopReason: 'error',
        startedAt: 1,
      },
      {
        id: 'interrupted-turn',
        sessionId: 'interrupted',
        status: 'ended',
        stopReason: 'error',
        error: {
          code: 'interrupted',
          message: 'The Server stopped during the Turn',
        },
        startedAt: 1,
      },
      {
        id: 'old-failure',
        sessionId: 'recovered',
        status: 'ended',
        stopReason: 'error',
        startedAt: 1,
      },
      {
        id: 'new-success',
        sessionId: 'recovered',
        status: 'ended',
        stopReason: 'end_turn',
        startedAt: 2,
      },
    ])
    .run();
  const { createCaller } = await startEngineTestHost({
    database,
    ...scriptedEngineInput(),
  });
  const caller = createCaller();
  const rows = (await caller.session.list({ archived: false })).sessions;
  expect(
    Object.fromEntries(
      rows.map(
        (
          row,
        ): [
          string,
          'failed' | 'idle' | 'needs_input' | 'running' | 'unread',
        ] => [row.sessionId, row.status],
      ),
    ),
  ).toEqual({
    'session-1': 'failed',
    interrupted: 'unread',
    recovered: 'unread',
    'gave-up': 'failed',
  });
});
