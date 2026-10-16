import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { countDatabaseReads, openTestDatabase } from '#mocks/database';
import { tool } from '#mocks/live-header-tool';
import { toFeedRowWrite } from '../../feed';
import { createLiveHeaderRowsReader } from './live-header-rows';

it('reads only the newest malformed Tool call while retaining all running calls', (): void => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);

  const reported = vi
    .spyOn(console, 'error')
    .mockImplementation((): void => {});

  onTestFinished((): void => reported.mockRestore());

  const malformed = Array.from(
    { length: 500 },
    (
      _,
      position,
    ): Omit<ReturnType<typeof toFeedRowWrite>, 'payload'> & {
      sessionId: string;
      payload: ReturnType<typeof sql>;
    } => ({
      ...toFeedRowWrite({
        ...tool,
        id: `bad-${position}`,
        toolCallId: `bad-${position}`,
        position,
        revision: position + 1,
      }),
      sessionId: 'session-1',
      payload: sql`'broken-json'`,
    }),
  );

  database.insert(feedRow).values(malformed).run();

  const current: SessionUpdate[] = [
    { ...tool, position: 500, revision: 501 },
    {
      ...tool,
      id: 'tool-2',
      toolCallId: 'tool-2',
      position: 501,
      revision: 502,
      status: 'pending',
    },
    {
      id: 'latest',
      messageId: 'latest',
      sessionId: 'session-1',
      turnId: 'turn-1',
      position: 502,
      revision: 503,
      state: 'settled',
      sessionUpdate: 'agent_message',
      content: [{ type: 'text', text: 'Progress' }],
    },
  ];

  for (const row of current)
    database
      .insert(feedRow)
      .values({ ...toFeedRowWrite(row), sessionId: 'session-1' })
      .run();
  const counted = countDatabaseReads(database);

  const result = createLiveHeaderRowsReader({ database: counted.database })({
    writer: undefined,
    sessionId: 'session-1',
    turnId: 'turn-1',
    rows: {},
  });

  expect(counted.metrics.rows).toBeLessThanOrEqual(4);
  expect(counted.metrics.queries).toBeLessThanOrEqual(3);
  expect(Object.keys(result.rows).sort()).toEqual([
    'latest',
    'tool-1',
    'tool-2',
  ]);
  expect(result.rejected).toBe(true);
  expect(reported).toHaveBeenCalledOnce();
});
