import type { AgentMessage, SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { countDatabaseReads, openTestDatabase } from '#mocks/database';
import { tool } from '#mocks/live-header-tool';
import { toFeedRowWrite } from '../../feed';
import { createLiveHeaderRowsReader } from './rows';

it('reads a 500-row Turn with three bounded seeks after many settled Tool calls', (): void => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);

  const previous = Array.from(
    { length: 500 },
    (
      _,
      position,
    ): typeof tool & {
      turnId: string;
      state: 'settled';
      status: 'completed';
    } => ({
      ...tool,
      id: `previous-${position}`,
      toolCallId: `previous-${position}`,
      turnId: 'previous',
      position,
      revision: position + 1,
      state: 'settled' as const,
      status: 'completed' as const,
    }),
  );

  const current: SessionUpdate[] = Array.from(
    { length: 500 },
    (_, index): AgentMessage => ({
      id: `message-${index}`,
      messageId: `message-${index}`,
      sessionId: 'session-1',
      turnId: 'turn-1',
      position: index + 500,
      revision: index + 501,
      state: 'settled',
      sessionUpdate: 'agent_message',
      content: [{ type: 'text', text: 'Progress' }],
    }),
  );

  current[50] = {
    id: 'thought-1',
    messageId: 'thought-1',
    sessionId: 'session-1',
    turnId: 'turn-1',
    position: 550,
    revision: 551,
    state: 'settled',
    sessionUpdate: 'agent_thought',
    content: [{ type: 'text', text: '**Checking tests**' }],
  };
  current[100] = { ...tool, position: 600, revision: 601 };
  current[101] = {
    ...tool,
    id: 'tool-2',
    toolCallId: 'tool-2',
    position: 601,
    revision: 602,
    status: 'pending',
  };
  current[200] = {
    id: 'retry-1',
    sessionId: 'session-1',
    turnId: 'turn-1',
    position: 700,
    revision: 2000,
    state: 'settled',
    sessionUpdate: 'notice',
    severity: 'warning',
    title: 'Retrying',
    _meta: { argo: { retry: { attempt: 2, maxAttempts: 5, delayMs: 1000 } } },
  };

  for (const row of [...previous, ...current]) {
    database
      .insert(feedRow)
      .values({ ...toFeedRowWrite(row), sessionId: 'session-1' })
      .run();
  }

  const counted = countDatabaseReads(database);

  const rows = createLiveHeaderRowsReader({ database: counted.database })({
    writer: undefined,
    sessionId: 'session-1',
    turnId: 'turn-1',
    rows: {},
  }).rows;

  expect(counted.metrics.rows).toBeLessThanOrEqual(4);
  expect(counted.metrics.queries).toBeLessThanOrEqual(3);
  expect(Object.keys(rows).sort()).toEqual([
    'retry-1',
    'thought-1',
    'tool-1',
    'tool-2',
  ]);
});
