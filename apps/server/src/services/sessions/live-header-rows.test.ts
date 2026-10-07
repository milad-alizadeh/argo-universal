import type {
  AgentMessage,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { createActor, fromPromise } from 'xstate';
import { countDatabaseReads, openTestDatabase } from '#mocks/database';
import { toFeedRowWrite } from '../feed/feed-row';
import { writerMachine } from '../feed/writer-machine';
import { toLiveHeader } from './live-header';
import { readLiveHeaderRows } from './live-header-rows';

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

it('reads a 500-row Turn with three bounded seeks after many settled Tool calls', () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const previous = Array.from({ length: 500 }, (_, position) => ({
    ...tool,
    id: `previous-${position}`,
    toolCallId: `previous-${position}`,
    turnId: 'previous',
    position,
    revision: position + 1,
    state: 'settled' as const,
    status: 'completed' as const,
  }));
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
  const rows = readLiveHeaderRows({
    database: counted.database,
    writer: undefined,
    sessionId: 'session-1',
    turnId: 'turn-1',
    rows: {},
  });
  expect(counted.metrics.rows).toBeLessThanOrEqual(4);
  expect(counted.metrics.queries).toBeLessThanOrEqual(3);
  expect(Object.keys(rows).sort()).toEqual([
    'retry-1',
    'thought-1',
    'tool-1',
    'tool-2',
  ]);
});

it('keeps the earlier running Tool call after writer and memory overlays complete the newer one', () => {
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
        writeBatch: fromPromise(() => new Promise<void>(() => {})),
      },
    }),
    { input: { database } },
  ).start();
  onTestFinished(() => {
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
  const rows = readLiveHeaderRows({
    database,
    writer,
    sessionId: 'session-1',
    turnId: 'turn-1',
    rows: { 'tool-2': completed },
  });
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

it('excludes the newest thought when it belongs to an earlier Turn', () => {
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
    readLiveHeaderRows({
      database: counted.database,
      writer: undefined,
      sessionId: 'session-1',
      turnId: 'turn-1',
      rows: {},
    }),
  ).toEqual({ 'tool-1': { ...tool, revision: 2 } });
  expect(counted.metrics.queries).toBeLessThanOrEqual(3);
});

it('reads no stored rows without an active Turn', () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const counted = countDatabaseReads(database);
  expect(
    readLiveHeaderRows({
      database: counted.database,
      writer: undefined,
      sessionId: 'session-1',
      turnId: null,
      rows: { 'tool-1': tool },
    }),
  ).toEqual({});
  expect(counted.metrics).toEqual({ queries: 0, rows: 0, sessionReads: 0 });
});
