import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { beforeEach, expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { hydrateStoredFeedRow, storedFeedColumns } from './feed-row';
import { FeedRowsJob } from './feed-rows-job';
import { committedTurnEndings } from './feed-storage';
import { prepareTurnSettlement } from './feed-turn-settlement';
import {
  settleArchivedChild,
  settleStoredTurn,
} from './stored-turn-settlement';

const turnId = 'turn-1';

const toolId = 'tool-1';

const endedAt = { stopReason: 'error', error: null, durationMs: 5 } as const;

let database: Database;

// One Turn that is still running: an open message and a Tool call in progress.
beforeEach((): void => {
  const opened = openTestDatabase();

  onTestFinished(opened.remove);
  database = opened.database;
  database
    .insert(turn)
    .values({ id: turnId, sessionId: 'session-1', status: 'running' })
    .run();
  database
    .insert(feedRow)
    .values([
      {
        sessionId: 'session-1',
        id: 'message-1',
        turnId,
        position: 0,
        revision: 1,
        state: 'open',
        sessionUpdate: 'agent_message',
        payloadVersion: 1,
        payload: { messageId: 'message-1', content: [] },
      },
      {
        sessionId: 'session-1',
        id: toolId,
        turnId,
        position: 1,
        revision: 2,
        state: 'open',
        sessionUpdate: 'tool_call_update',
        payloadVersion: 1,
        payload: {
          toolCallId: toolId,
          title: 'Read',
          kind: 'read',
          status: 'in_progress',
          content: [],
        },
      },
    ])
    .run();
  database
    .update(session)
    .set({ maxRevision: 2 })
    .where(eq(session.id, 'session-1'))
    .run();
});

const storedRows = (): ReturnType<typeof hydrateRows> =>
  hydrateRows(database.select(storedFeedColumns).from(feedRow).all());

const hydrateRows = (
  rows: (typeof feedRow.$inferSelect)[],
): ReturnType<typeof hydrateStoredFeedRow>[] =>
  rows.map((row) => hydrateStoredFeedRow('session-1', row));

const settledTool = {
  id: toolId,
  state: 'settled',
  status: 'cancelled',
};

it('settles the Turn in the live Feed', () => {
  const rows = Object.fromEntries(storedRows().map((row) => [row.id, row]));

  const application = prepareTurnSettlement(
    {
      sessionId: 'session-1',
      rows,
      maxRevision: 2,
      nextPosition: 2,
      findWrittenRow: (): undefined => {},
      streamEvents: [],
      changedRowIds: [],
      messageStreams: {},
    },
    { type: 'feed.completeTurn', turnId },
  );

  expect(Object.values(application.state?.rows ?? {})).toMatchObject([
    { id: 'message-1', state: 'settled', revision: 3 },
    { ...settledTool, revision: 4 },
  ]);
});

it('settles an archived child Session Turn in storage with the same rule', () => {
  database.transaction((transaction): void => {
    settleArchivedChild(transaction, 'session-1');
  });

  expect(storedRows()).toMatchObject([
    { id: 'message-1', state: 'settled', revision: 3 },
    { ...settledTool, revision: 4 },
  ]);
  expect(database.select().from(session).get()?.maxRevision).toBe(4);
});

it('writes the Turn end marker after the stored rows when Engine restart settles it', () => {
  database.transaction((transaction): void => {
    settleStoredTurn(transaction, {
      sessionId: 'session-1',
      turnId,
      ending: { kind: 'engine_restart', turnEnd: endedAt },
    });
  });

  expect(storedRows().at(-1)).toMatchObject({
    id: `${turnId}:end`,
    position: 2,
    revision: 3,
    turnId,
    _meta: { argo: { turnEnd: endedAt } },
  });
});
