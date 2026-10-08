import type {
  AgentMessage,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createActor, fromPromise } from 'xstate';
import { countDatabaseReads, openTestDatabase } from '#mocks/database';
import { toFeedRowWrite } from '../feed';
import { writerMachine } from '../feed';
import { toLiveHeader } from './live-header';
import { createLiveHeaderRowsReader } from './live-header-rows';

const tool: ToolCallUpdate = {
  id: 'tool-1',
  sessionId: 'session-1',
  turnId: 'turn-1',
  position: 1,
  revision: 1,
  state: 'open',
  sessionUpdate: 'tool_call_update',
  toolCallId: 'tool-1',
  title: 'Read file',
  kind: 'read',
  status: 'in_progress',
  content: [],
  locations: [{ path: 'first.ts' }],
};

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

it('keeps the earlier running Tool call after writer and memory overlays complete the newer one', (): void => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const newer = {
    ...tool,
    id: 'tool-2',
    toolCallId: 'tool-2',
    position: 2,
    revision: 2,
  };
  for (const row of [tool, newer])
    database
      .insert(feedRow)
      .values({ ...toFeedRowWrite(row), sessionId: 'session-1' })
      .run();
  const writer = createActor(
    writerMachine.provide({
      actors: {
        writeBatch: fromPromise(
          (): Promise<void> => new Promise<void>((): void => {}),
        ),
      },
    }),
    {
      input: {
        now: (): number => Date.now(),
        database,
      },
    },
  ).start();
  onTestFinished((): void => {
    writer.stop();
  });
  writer.send({
    type: 'writer.write',
    job: {
      type: 'feedRows',
      sessionId: 'session-1',
      maxRevision: 3,
      rows: [toFeedRowWrite({ ...newer, revision: 3, title: 'Queued title' })],
    },
  });
  const completed = {
    ...newer,
    revision: 4,
    status: 'completed' as const,
    state: 'settled' as const,
  };
  const rows = createLiveHeaderRowsReader({ database })({
    writer,
    sessionId: 'session-1',
    turnId: 'turn-1',
    rows: { 'tool-2': completed },
  }).rows;
  expect(rows).toEqual({ 'tool-1': tool, 'tool-2': completed });
  expect(
    toLiveHeader(
      {
        activeTurnId: 'turn-1',
        activeTurnStartedAt: 100,
        permissionQueue: [],
        pendingElicitation: null,
      },
      Object.values(rows),
    ),
  ).toEqual({
    text: 'Reading first.ts',
    source: { type: 'tool_call', toolCallId: 'tool-1' },
    startedAt: 100,
  });
});

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

it('reads no stored rows without an active Turn', (): void => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const counted = countDatabaseReads(database);
  expect(
    createLiveHeaderRowsReader({ database: counted.database })({
      writer: undefined,
      sessionId: 'session-1',
      turnId: null,
      rows: { 'tool-1': tool },
    }).rows,
  ).toEqual({});
  expect(counted.metrics).toEqual({ queries: 0, rows: 0, sessionReads: 0 });
});

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
