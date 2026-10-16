import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { countDatabaseReads, openTestDatabase } from '#mocks/database';
import { tool } from '#mocks/live-header-tool';
import { toFeedRowWrite } from '../../feed';
import { createLiveHeaderRowsReader } from './rows';

it('excludes the newest thought when it belongs to an earlier Turn', (): void => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);

  const thought: SessionUpdate = {
    id: 'previous-thought',
    messageId: 'previous-thought',
    sessionId: 'session-1',
    turnId: 'previous',
    position: 0,
    revision: 1,
    state: 'settled',
    sessionUpdate: 'agent_thought',
    content: [{ type: 'text', text: '**Old work**' }],
  };

  for (const row of [thought, { ...tool, revision: 2 }])
    database
      .insert(feedRow)
      .values({ ...toFeedRowWrite(row), sessionId: 'session-1' })
      .run();
  const counted = countDatabaseReads(database);
  expect(
    createLiveHeaderRowsReader({ database: counted.database })({
      writer: undefined,
      sessionId: 'session-1',
      turnId: 'turn-1',
      rows: {},
    }).rows,
  ).toEqual({ 'tool-1': { ...tool, revision: 2 } });
  expect(counted.metrics.queries).toBeLessThanOrEqual(3);
});
