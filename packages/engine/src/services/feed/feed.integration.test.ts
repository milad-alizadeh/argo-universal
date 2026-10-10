import { agentAdapters } from '@repo/agents';
import type {
  FeedChange,
  FeedSubscribeOutput,
  FeedSyncPoint,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { session as sessionTable } from '@repo/db/schema';
import {
  createMockAdapter,
  type MockAgentStream,
  type MockAgentScript,
} from '@repo/mocks/agent';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import {
  countDatabaseReads,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { storedMessage as message } from '#mocks/feed';
import { appRouter } from '../../engine/router';
import { writeJobs } from './writer-job';

const agentFeedEvent = 'agent.feed';
const afterRejectionRowId = 'after-rejection';
const storedBeforeStreamText = 'Stored first';
const overlappingTimersRowId = 'overlapping-timers';
const turnStartedEvent = 'agent.turnStarted';
const thirdMessageRowId = 'message-2#0';
const missingAgentStream = 'The Agent has no stream';
const appendRowEvent = 'row.append';
const upsertRowEvent = 'row.upsert';
const fifthMessageRowId = 'message-5#0';
const recoveredRowId = 'recovered-row';
const lastRowId = 'last-row';
const teardownRowId = 'teardown-row';
const fourthStoredUpsert = 'upsert message-4#0 @5';
const dropFeedWriteTrigger = 'DROP TRIGGER hold_feed_writes';
const queuedToolActivity = 'Reading files';

let database: Database;
let runtimeDirectory: string;
let removeDatabase: () => void;
let feedTestHost: Awaited<ReturnType<typeof startEngineTestHost>>;
let controller: AbortController;
let agentStream: MockAgentStream | undefined;

const startFeedTestHost = async (
  script: MockAgentScript = {},
  agent = 'mock',
): Promise<void> => {
  let identity = 0;
  feedTestHost = await startEngineTestHost({
    database,
    runtimeDirectory,
    createId: () => (++identity === 1 ? 'turn-1' : `feed-fixture-${identity}`),
    adapters: [
      createMockAdapter(
        {
          ...script,
          stream: (stream) => {
            agentStream = stream;
            return script.stream?.(stream);
          },
        },
        agent,
      ),
    ],
  });
  feedTestHost.sessionRegistry.send({
    type: 'sessions.open',
    sessionId: 'session-1',
    agent,
  });
  await vi.waitFor(() =>
    expect(
      database.$client
        .prepare('SELECT vendor_session_id FROM session WHERE id = ?')
        .get('session-1'),
    ).toMatchObject({ vendor_session_id: 'vendor-1' }),
  );
};

const createFeedRouterCaller = (): ReturnType<typeof appRouter.createCaller> =>
  feedTestHost.createCaller({ signal: controller.signal });

const sendAgentFeedChange = (change: FeedChange): void => {
  if (!agentStream) throw new Error(missingAgentStream);
  agentStream.send({ type: agentFeedEvent, change });
};
const createOpenMessageChange = (id: string, text = ''): FeedChange => ({
  type: 'upsert',
  update: {
    id,
    state: 'open',
    sessionUpdate: 'agent_message',
    messageId: id,
    content: [{ type: 'text', text }],
  },
});
const createTextAppendChange = (id: string, text: string): FeedChange => ({
  type: 'append',
  id,
  field: 'content.0.text',
  text,
});

const subscribe = async (
  after: FeedSyncPoint | null,
  sessionId = 'session-1',
): Promise<AsyncIterator<FeedSubscribeOutput, void>> =>
  (await createFeedRouterCaller().feed.subscribe({ sessionId, after }))[
    Symbol.asyncIterator
  ]();
const takeFeedChanges = async (
  feedUpdates: AsyncIterator<FeedSubscribeOutput>,
  changeCount: number,
): Promise<FeedSubscribeOutput[]> => {
  const values: FeedSubscribeOutput[] = [];
  while (values.length < changeCount) {
    const next = await feedUpdates.next();
    if (next.done) break;
    if (next.value.type !== 'snapshot') values.push(next.value);
  }
  return values;
};
const summarizeFeedChanges = (outputs: FeedSubscribeOutput[]): string[] =>
  outputs.map((output): string => {
    if (output.type === upsertRowEvent)
      return `upsert ${output.row.id} @${output.rev}`;
    if (output.type === appendRowEvent)
      return `append ${output.id} +${output.text} at ${output.off} @${output.rev}`;
    return output.type;
  });

const longHistoryRows = 450;
const longHistoryPositions = Array.from(
  { length: longHistoryRows },
  (_, position): number => position,
);
// Stored rows after the five every test starts with, so one catch-up spans three pages.
const storeLongHistory = (): void =>
  writeJobs(database, [
    {
      type: 'feedRows',
      sessionId: 'session-1',
      rows: longHistoryPositions
        .slice(5)
        .map((position): ReturnType<typeof message> => message(position)),
      maxRevision: longHistoryRows,
    },
  ]);

beforeEach((): void => {
  vi.useFakeTimers();
  controller = new AbortController();
  ({
    database,
    directory: runtimeDirectory,
    remove: removeDatabase,
  } = openTestDatabase({ epoch: 3 }));
  writeJobs(database, [
    {
      type: 'feedRows',
      sessionId: 'session-1',
      rows: [0, 1, 2, 3, 4].map((position): ReturnType<typeof message> =>
        message(position),
      ),
      maxRevision: 5,
    },
  ]);
  onTestFinished(removeDatabase);
});

afterEach(async (): Promise<void> => {
  controller.abort();
  database.$client.exec('DROP TRIGGER IF EXISTS hold_feed_writes');
  vi.useRealTimers();
});

describe('feed.page', (): void => {
  beforeEach(async (): Promise<void> => startFeedTestHost());

  it('reads the newest rows in position order', async (): Promise<void> => {
    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 2,
      }),
    ).toEqual({
      epoch: 3,
      maxRevision: 5,
      rows: [message(3), message(4)],
      hasOlder: true,
      startCursor: 3,
      staleCursor: false,
    });
  });

  it('reads the rows before a cursor', async (): Promise<void> => {
    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'before',
        cursor: 3,
        epoch: 3,
        limit: 2,
      }),
    ).toMatchObject({
      rows: [message(1), message(2)],
      hasOlder: true,
      startCursor: 1,
      staleCursor: false,
    });
    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'before',
        cursor: 1,
        epoch: 3,
      }),
    ).toMatchObject({ rows: [message(0)], hasOlder: false, startCursor: 0 });
  });

  it('answers a cursor from another epoch with the tail', async (): Promise<void> => {
    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'before',
        cursor: 2,
        epoch: 2,
        limit: 1,
      }),
    ).toMatchObject({
      epoch: 3,
      rows: [message(4)],
      startCursor: 4,
      staleCursor: true,
    });
  });

  it('flags a tail request from another epoch', async (): Promise<void> => {
    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        epoch: 2,
        limit: 1,
      }),
    ).toMatchObject({ epoch: 3, rows: [message(4)], staleCursor: true });
  });

  it('pages a Session with no rows', async (): Promise<void> => {
    insertSession(database, { id: 'session-2' });

    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-2',
        direction: 'tail',
      }),
    ).toEqual({
      epoch: 0,
      maxRevision: 0,
      rows: [],
      hasOlder: false,
      startCursor: null,
      staleCursor: false,
    });
  });

  it('fails with NOT_FOUND for an unknown Session', async (): Promise<void> => {
    await expect(
      createFeedRouterCaller().feed.page({
        sessionId: 'session-9',
        direction: 'tail',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('keeps the place of a stored row that a change brings back', async (): Promise<void> => {
    sendAgentFeedChange({
      type: 'patch',
      id: 'message-3#0',
      set: { messageId: 'plan-3' },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 2,
      }),
    ).toMatchObject({
      maxRevision: 6,
      rows: [{ ...message(3), revision: 6, messageId: 'plan-3' }, message(4)],
    });
  });

  it('reads rows that the feed actor wrote through the database writer', async (): Promise<void> => {
    sendAgentFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hi'));
    sendAgentFeedChange({
      type: 'patch',
      id: fifthMessageRowId,
      set: { state: 'settled' },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 1,
      }),
    ).toMatchObject({
      maxRevision: 7,
      rows: [
        {
          id: fifthMessageRowId,
          position: 5,
          revision: 7,
          state: 'settled',
          content: [{ type: 'text', text: 'Hi' }],
        },
      ],
    });
  });
});

describe('feed.row', (): void => {
  beforeEach(async (): Promise<void> => startFeedTestHost());

  it('reads a stored row', async (): Promise<void> => {
    expect(
      await createFeedRouterCaller().feed.row({
        sessionId: 'session-1',
        id: thirdMessageRowId,
      }),
    ).toEqual(message(2));
  });

  it('reads the newest version of an open row before it is written', async (): Promise<void> => {
    sendAgentFeedChange(createOpenMessageChange(fifthMessageRowId));
    sendAgentFeedChange(createTextAppendChange(fifthMessageRowId, 'Hel'));

    expect(
      await createFeedRouterCaller().feed.row({
        sessionId: 'session-1',
        id: fifthMessageRowId,
      }),
    ).toMatchObject({ revision: 7, content: [{ type: 'text', text: 'Hel' }] });
  });

  it('fails with NOT_FOUND for an unknown row', async (): Promise<void> => {
    await expect(
      createFeedRouterCaller().feed.row({
        sessionId: 'session-1',
        id: 'message-9#0',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('feed.subscribe', (): void => {
  it('with no sync point, sends the rows not yet stored, then live changes', async (): Promise<void> => {
    await startFeedTestHost();
    sendAgentFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hel'));
    const updates = await subscribe(null);

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 1))).toEqual([
      'upsert message-5#0 @6',
    ]);

    sendAgentFeedChange(createTextAppendChange(fifthMessageRowId, 'lo'));
    sendAgentFeedChange(createOpenMessageChange('message-6#0'));
    await vi.advanceTimersByTimeAsync(60);
    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      'append message-5#0 +lo at 3 @7',
      'upsert message-6#0 @8',
    ]);
  });

  it('catches up from a revision with stored rows and rows not yet written, without repeats', async (): Promise<void> => {
    await startFeedTestHost();
    sendAgentFeedChange(createOpenMessageChange(fifthMessageRowId));
    sendAgentFeedChange(createTextAppendChange(fifthMessageRowId, 'Hel'));
    const updates = await subscribe({ epoch: 3, revision: 4 });

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      fourthStoredUpsert,
      'upsert message-5#0 @7',
    ]);

    sendAgentFeedChange(createTextAppendChange(fifthMessageRowId, 'lo'));
    await vi.advanceTimersByTimeAsync(60);
    expect(summarizeFeedChanges(await takeFeedChanges(updates, 1))).toEqual([
      'append message-5#0 +lo at 3 @8',
    ]);
  });

  it('catches up with rows the database writer still holds', async (): Promise<void> => {
    await startFeedTestHost();
    database.$client
      .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
    onTestFinished((): void => {
      database.$client.exec('DROP TRIGGER IF EXISTS hold_feed_writes');
    });
    sendAgentFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hi'));
    sendAgentFeedChange({
      type: 'patch',
      id: fifthMessageRowId,
      set: { state: 'settled' },
    });
    await vi.advanceTimersByTimeAsync(0);

    const updates = await subscribe({ epoch: 3, revision: 5 });

    expect(await takeFeedChanges(updates, 1)).toEqual([
      {
        type: upsertRowEvent,
        rev: 7,
        row: expect.objectContaining({
          id: fifthMessageRowId,
          state: 'settled',
        }),
      },
    ]);
  });

  it('reads a canonical queued row before its transaction retries', async (): Promise<void> => {
    await startFeedTestHost();
    database.$client
      .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
    if (!agentStream) throw new Error(missingAgentStream);
    agentStream.send({ type: turnStartedEvent });
    const { id, state, sessionUpdate, messageId, content } = message(5, 6);
    sendAgentFeedChange({
      type: 'upsert',
      update: { id, state, sessionUpdate, messageId, content },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(
      await createFeedRouterCaller().feed.row({
        sessionId: 'session-1',
        id: fifthMessageRowId,
      }),
    ).toEqual(message(5, 6));
    database.$client.exec(dropFeedWriteTrigger);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 1,
      }),
    ).toMatchObject({ rows: [message(5, 6)], maxRevision: 6 });
  });

  it('reconnects across stored, queued and live revisions before retry commits', async (): Promise<void> => {
    await startFeedTestHost();
    database.$client
      .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
    sendAgentFeedChange(createOpenMessageChange(fifthMessageRowId, 'Queued'));
    sendAgentFeedChange({
      type: 'patch',
      id: fifthMessageRowId,
      set: { state: 'settled' },
    });
    await vi.advanceTimersByTimeAsync(0);
    const updates = await subscribe({ epoch: 3, revision: 4 });
    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      fourthStoredUpsert,
      'upsert message-5#0 @7',
    ]);
    sendAgentFeedChange({
      type: 'patch',
      id: fifthMessageRowId,
      set: { content: [{ type: 'text', text: 'Newest' }] },
    });
    await vi.advanceTimersByTimeAsync(60);
    expect(await takeFeedChanges(updates, 1)).toEqual([
      {
        type: 'row.patch',
        id: fifthMessageRowId,
        rev: 8,
        set: { content: [{ type: 'text', text: 'Newest' }] },
      },
    ]);
    const reconnected = await subscribe({ epoch: 3, revision: 5 });
    expect(await takeFeedChanges(reconnected, 1)).toEqual([
      {
        type: upsertRowEvent,
        rev: 8,
        row: expect.objectContaining({
          id: fifthMessageRowId,
          position: 5,
          content: [{ type: 'text', text: 'Newest' }],
        }),
      },
    ]);
    database.$client.exec(dropFeedWriteTrigger);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 1,
      }),
    ).toMatchObject({
      maxRevision: 8,
      rows: [
        {
          id: fifthMessageRowId,
          position: 5,
          revision: 8,
          content: [{ type: 'text', text: 'Newest' }],
        },
      ],
    });
  });

  it('catches up more rows than one page once each, in revision order, before live changes', async (): Promise<void> => {
    storeLongHistory();
    await startFeedTestHost();
    const updates = await subscribe({ epoch: 3, revision: 0 });

    const caughtUp = await takeFeedChanges(updates, longHistoryRows);
    sendAgentFeedChange(createOpenMessageChange('live-row'));
    await vi.advanceTimersByTimeAsync(60);

    expect(
      summarizeFeedChanges([
        ...caughtUp,
        ...(await takeFeedChanges(updates, 1)),
      ]),
    ).toEqual([
      ...longHistoryPositions.map(
        (position): string => `upsert message-${position}#0 @${position + 1}`,
      ),
      `upsert live-row @${longHistoryRows + 1}`,
    ]);
  });

  it('reads a long catch-up from storage one page at a time', async (): Promise<void> => {
    storeLongHistory();
    await startFeedTestHost();
    const counted = countDatabaseReads(feedTestHost.database);
    const updates = await subscribe({ epoch: 3, revision: 0 });

    await takeFeedChanges(updates, longHistoryRows);

    expect(counted.metrics.largestRead).toBeLessThanOrEqual(200);
  });

  it('sends a row that changed between catch-up pages once, whole, at its newest revision', async (): Promise<void> => {
    storeLongHistory();
    await startFeedTestHost();
    const updates = await subscribe({ epoch: 3, revision: 0 });
    const firstPage = await takeFeedChanges(updates, 200);
    sendAgentFeedChange({
      type: 'patch',
      id: 'message-300#0',
      set: { content: [{ type: 'text', text: 'Changed' }] },
    });
    await vi.advanceTimersByTimeAsync(60);

    const rest = await takeFeedChanges(updates, longHistoryRows - 200);

    expect({
      revisions: summarizeFeedChanges([...firstPage, ...rest]),
      changed: rest.at(-1),
    }).toEqual({
      revisions: [
        ...longHistoryPositions
          .filter((position): boolean => position !== 300)
          .map(
            (position): string =>
              `upsert message-${position}#0 @${position + 1}`,
          ),
        `upsert message-300#0 @${longHistoryRows + 1}`,
      ],
      changed: expect.objectContaining({
        row: expect.objectContaining({
          position: 300,
          content: [{ type: 'text', text: 'Changed' }],
        }),
      }),
    });
  });

  it('resets a subscriber from another epoch, then sends the rows not yet stored', async (): Promise<void> => {
    await startFeedTestHost();
    sendAgentFeedChange(createOpenMessageChange(fifthMessageRowId));
    const updates = await subscribe({ epoch: 2, revision: 9 });

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      'reset',
      'upsert message-5#0 @6',
    ]);
  });

  it('sends stored rows and one snapshot before a closed Session stream ends', async (): Promise<void> => {
    await startFeedTestHost();
    await feedTestHost.caller.session.close({ sessionId: 'session-1' });
    const updates = await subscribe({ epoch: 3, revision: 3 });

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      'upsert message-3#0 @4',
      fourthStoredUpsert,
    ]);
    expect((await updates.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        state: 'idle',
        title: '',
        titleSource: 'prompt',
        checkout: { type: 'main', path: '/project', branch: null },
      },
    });
    expect((await updates.next()).value).toEqual({
      type: 'closed',
      failure: null,
    });
    expect(await updates.next()).toMatchObject({ done: true });
  });

  it('fails with NOT_FOUND for an unknown Session', async (): Promise<void> => {
    await startFeedTestHost();
    const updates = await subscribe(null, 'session-9');

    await expect(updates.next()).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

const feedCloseDeadline = 1_000;

it('ends a closed Session Feed after draining its last rows', async (): Promise<void> => {
  vi.useRealTimers();
  let stream: MockAgentStream | undefined;
  const adapter = createMockAdapter({
    stream: (current): undefined => {
      stream = current;
    },
  });
  feedTestHost = await startEngineTestHost({
    database,
    runtimeDirectory,
    adapters: [adapter],
  });
  await feedTestHost.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start a Turn' }],
  });
  const updates = (
    await feedTestHost
      .createCaller({ signal: controller.signal })
      .feed.subscribe({
        sessionId: 'session-1',
        after: { epoch: 3, revision: 5 },
      })
  )[Symbol.asyncIterator]();
  const first = await updates.next();
  expect(first.done).toBe(false);
  if (!stream) throw new Error('No Agent stream');
  stream.send({
    type: agentFeedEvent,
    change: createOpenMessageChange(lastRowId, 'Last message'),
  });
  const closing = feedTestHost.caller.session.close({ sessionId: 'session-1' });
  const events = await drainClosedFeed(updates);
  expect(events.at(-1)).toEqual({ type: 'closed', failure: null });
  expect(events).toContainEqual(
    expect.objectContaining({
      type: upsertRowEvent,
      row: expect.objectContaining({ id: lastRowId }),
    }),
  );
  await closing;
  const heldRevision = Math.max(
    5,
    ...events.flatMap((event): number[] => ('rev' in event ? [event.rev] : [])),
  );
  await feedTestHost.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Continue the Session' }],
  });
  const resumed = (
    await feedTestHost
      .createCaller({ signal: controller.signal })
      .feed.subscribe({
        sessionId: 'session-1',
        after: { epoch: 3, revision: heldRevision },
      })
  )[Symbol.asyncIterator]();
  const resumedFirst = await resumed.next();
  expect(resumedFirst.done).toBe(false);
  if (!resumedFirst.value) throw new Error('No resumed Feed event');
  const nextEvents: FeedSubscribeOutput[] = [resumedFirst.value];
  stream.send({
    type: agentFeedEvent,
    change: createOpenMessageChange('next-row', 'Next message'),
  });
  for await (const event of {
    [Symbol.asyncIterator]: (): AsyncIterator<FeedSubscribeOutput, void> =>
      resumed,
  }) {
    nextEvents.push(event);
    if (event.type === upsertRowEvent && event.row.id === 'next-row') break;
  }
  expect(nextEvents).toContainEqual(
    expect.objectContaining({
      type: upsertRowEvent,
      row: expect.objectContaining({ id: 'next-row' }),
    }),
  );
  const nextRevisions = nextEvents.flatMap((event): number[] =>
    'rev' in event ? [event.rev] : [],
  );
  expect(nextRevisions.length).toBeGreaterThan(0);
  expect(Math.min(...nextRevisions)).toBeGreaterThan(heldRevision);
});

it('reads a closed Session Feed without opening a Session', async (): Promise<void> => {
  vi.useRealTimers();
  const connect = vi.fn<() => Promise<never>>(async () => {
    throw new Error('Reading a closed Feed must not launch the Agent');
  });
  feedTestHost = await startEngineTestHost({
    database,
    runtimeDirectory,
    adapters: [{ ...createMockAdapter(), connect }],
  });
  const events = await drainClosedFeed(
    (
      await feedTestHost
        .createCaller({ signal: controller.signal })
        .feed.subscribe({
          sessionId: 'session-1',
          after: { epoch: 3, revision: 3 },
        })
    )[Symbol.asyncIterator](),
  );
  expect(events.map((event): typeof event.type => event.type)).toEqual([
    upsertRowEvent,
    upsertRowEvent,
    'snapshot',
    'closed',
  ]);
  expect(events.at(-1)).toEqual({ type: 'closed', failure: null });
  expect(events[2]).toMatchObject({
    snapshot: { state: 'idle', configOptions: [], maxRevision: 5 },
  });
  expect(connect).not.toHaveBeenCalled();
});

it('keeps a Subagent Feed stream open until its caller aborts', async (): Promise<void> => {
  await startFeedTestHost();
  insertSession(database, { id: 'subagent', parentSessionId: 'session-1' });
  const updates = await subscribe(null, 'subagent');
  expect((await updates.next()).value).toMatchObject({ type: 'snapshot' });
  const waiting = updates.next();
  controller.abort();
  expect(await waiting).toMatchObject({ done: true });
});

it('ends a pending live Feed iterator when its caller aborts', async (): Promise<void> => {
  await startFeedTestHost();
  const updates = await subscribe(null);
  await updates.next();
  const waiting = updates.next();
  controller.abort();
  expect(await waiting).toMatchObject({ done: true });
});

it('keeps another Feed subscriber live after a caller aborts', async (): Promise<void> => {
  await startFeedTestHost();
  const aborted = await subscribe(null);
  await aborted.next();
  const pendingAbort = aborted.next();
  const continuingController = new AbortController();
  onTestFinished((): void => continuingController.abort());
  const continuing = (
    await feedTestHost
      .createCaller({
        signal: continuingController.signal,
      })
      .feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();
  await continuing.next();
  controller.abort();
  await pendingAbort;
  sendAgentFeedChange(
    createOpenMessageChange('remaining-reader', 'Still connected'),
  );
  await vi.advanceTimersByTimeAsync(60);
  expect(await takeFeedChanges(continuing, 1)).toEqual([
    expect.objectContaining({
      type: upsertRowEvent,
      rev: 6,
      row: expect.objectContaining({ id: 'remaining-reader' }),
    }),
  ]);
});

it('rejects a Feed stream when stored Session hydration fails', async (): Promise<void> => {
  await startFeedTestHost();
  const updates = await subscribe(null);
  await updates.next();
  database.$client.exec("UPDATE session SET title_source = 'unrecognised'");
  sendAgentFeedChange(createOpenMessageChange('snapshot-rejection'));
  await expect(updates.next()).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unrecognised Session row',
  });
});

it.each(agentAdapters.map(({ agent }): string => agent))(
  'keeps the %s Feed subscriber attached after native recovery',
  async (agent): Promise<void> => {
    database.update(sessionTable).set({ agent }).run();
    const streams: MockAgentStream[] = [];
    await startFeedTestHost(
      {
        stream: (stream): undefined => {
          streams.push(stream);
        },
      },
      agent,
    );
    const updates = await subscribe({ epoch: 3, revision: 5 });
    await updates.next();
    const firstStream = streams[0];
    if (!firstStream) throw new Error('Agent stream missing');
    firstStream.fail(new Error('Native Session ended'));
    await vi.advanceTimersByTimeAsync(1_000);
    const recoveredStream = streams[1];
    if (!recoveredStream) throw new Error('Agent did not recover');
    recoveredStream.send({
      type: agentFeedEvent,
      change: createOpenMessageChange(recoveredRowId, 'After recovery'),
    });
    await vi.advanceTimersByTimeAsync(60);
    const received: FeedSubscribeOutput[] = [];
    for await (const event of {
      [Symbol.asyncIterator]: (): typeof updates => updates,
    }) {
      received.push(event);
      if (event.type === upsertRowEvent && event.row.id === recoveredRowId)
        break;
    }
    expect(
      received.filter(
        (event): boolean =>
          event.type === upsertRowEvent && event.row.id === recoveredRowId,
      ),
    ).toEqual([
      expect.objectContaining({
        rev: 7,
        row: expect.objectContaining({
          position: 6,
          content: [{ type: 'text', text: 'After recovery' }],
        }),
      }),
    ]);
  },
);

async function drainClosedFeed(
  updates: AsyncIterator<FeedSubscribeOutput>,
): Promise<FeedSubscribeOutput[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject): void => {
    timer = setTimeout(
      (): void =>
        reject(
          new Error(
            `Feed did not close within feedCloseDeadline (${feedCloseDeadline} ms)`,
          ),
        ),
      feedCloseDeadline,
    );
  });
  const drained = (async (): Promise<FeedSubscribeOutput[]> => {
    const events: FeedSubscribeOutput[] = [];
    for await (const event of {
      [Symbol.asyncIterator]: (): AsyncIterator<FeedSubscribeOutput, void> =>
        updates,
    })
      events.push(event);
    return events;
  })();
  try {
    return await Promise.race([drained, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

it('persists the final buffered Feed row during real Engine shutdown', async (): Promise<void> => {
  await startFeedTestHost();
  sendAgentFeedChange(
    createOpenMessageChange(teardownRowId, 'Before shutdown'),
  );
  expect(
    await feedTestHost.caller.feed.row({
      sessionId: 'session-1',
      id: teardownRowId,
    }),
  ).toMatchObject({ state: 'open' });
  await feedTestHost.stop();
  expect(
    database.$client
      .prepare('SELECT payload FROM feed_row WHERE id = ?')
      .get(teardownRowId),
  ).toMatchObject({
    payload: expect.stringContaining('Before shutdown'),
  });
});

it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'keeps %s queued Tool-call headers visible before persistence',
  async (agent): Promise<void> => {
    let stream: MockAgentStream | undefined;
    await startFeedTestHost(
      {
        stream: (current): undefined => {
          stream = current;
        },
      },
      agent,
    );
    if (!stream) throw new Error('No Agent stream');
    database.$client
      .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
    stream.send({ type: turnStartedEvent });
    stream.send({
      type: 'agent.feed',
      change: {
        type: 'upsert',
        update: {
          id: 'queued-tool',
          sessionUpdate: 'tool_call_update',
          state: 'settled',
          toolCallId: 'queued-tool',
          title: 'Read queued file',
          kind: 'read',
          status: 'in_progress',
          content: [],
        },
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(
      (await createFeedRouterCaller().session.list({ archived: false }))
        .sessions,
    ).toMatchObject([{ sessionId: 'session-1', activity: queuedToolActivity }]);
    const updates = await subscribe({ epoch: 3, revision: 5 });
    await takeFeedChanges(updates, 1);
    expect((await updates.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: { state: 'running', liveHeader: { text: queuedToolActivity } },
    });
    database.$client.exec(dropFeedWriteTrigger);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      (await createFeedRouterCaller().session.list({ archived: false }))
        .sessions,
    ).toMatchObject([{ sessionId: 'session-1', activity: queuedToolActivity }]);
  },
);

it('streams buffered Agent changes after 60 ms while SQL waits for the store timer', async () => {
  await startFeedTestHost();
  const updates = await subscribe({ epoch: 3, revision: 5 });
  await updates.next();
  // Establish the autonomous Turn before observing the row batch.
  if (!agentStream) throw new Error(missingAgentStream);
  agentStream.send({ type: turnStartedEvent });
  await updates.next();
  let received = false;
  const next = takeFeedChanges(updates, 2).then((events) => {
    received = true;
    return events;
  });
  sendAgentFeedChange(createOpenMessageChange('timed-row'));
  await vi.advanceTimersByTimeAsync(30);
  sendAgentFeedChange(createTextAppendChange('timed-row', 'Hello'));
  await vi.advanceTimersByTimeAsync(29);
  expect(received).toBe(false);
  expect(
    database.$client
      .prepare('SELECT id FROM feed_row WHERE id = ?')
      .get('timed-row'),
  ).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect((await next).map((event) => event.type)).toEqual([
    upsertRowEvent,
    appendRowEvent,
  ]);
  await vi.advanceTimersByTimeAsync(939);
  expect(
    database.$client
      .prepare('SELECT id FROM feed_row WHERE id = ?')
      .get('timed-row'),
  ).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect(
    database.$client
      .prepare(
        "SELECT revision, state, json_extract(payload, '$.content[0].text') AS text FROM feed_row WHERE session_id = ? AND id = ?",
      )
      .get('session-1', 'timed-row'),
  ).toEqual({ revision: 7, state: 'open', text: 'Hello' });
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 1,
    }),
  ).toMatchObject({
    rows: [
      {
        id: 'timed-row',
        revision: 7,
        state: 'open',
        content: [{ text: 'Hello' }],
      },
    ],
  });
});

it('persists the latest open row when the store timer expires before its next stream batch', async () => {
  await startFeedTestHost();
  const updates = await subscribe({ epoch: 3, revision: 5 });
  await updates.next();
  sendAgentFeedChange(createOpenMessageChange(overlappingTimersRowId));
  await vi.advanceTimersByTimeAsync(950);
  await takeFeedChanges(updates, 1);
  sendAgentFeedChange(
    createTextAppendChange(overlappingTimersRowId, storedBeforeStreamText),
  );
  let streamed = false;
  const next = takeFeedChanges(updates, 1).then((events) => {
    streamed = true;
    return events;
  });
  await vi.advanceTimersByTimeAsync(50);
  expect(streamed).toBe(false);
  expect(
    database.$client
      .prepare(
        "SELECT revision, state, json_extract(payload, '$.content[0].text') AS text FROM feed_row WHERE session_id = ? AND id = ?",
      )
      .get('session-1', overlappingTimersRowId),
  ).toEqual({ revision: 7, state: 'open', text: 'Stored first' });
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 1,
    }),
  ).toMatchObject({
    rows: [
      {
        id: overlappingTimersRowId,
        revision: 7,
        content: [{ text: storedBeforeStreamText }],
      },
    ],
  });
  await vi.advanceTimersByTimeAsync(10);
  expect(await next).toMatchObject([
    { type: appendRowEvent, text: storedBeforeStreamText },
  ]);
});

it('rejects unreadable and missing stored rows without writing changes, then accepts the next Agent row', async () => {
  await startFeedTestHost();
  const updates = await subscribe({ epoch: 3, revision: 5 });
  await updates.next();
  let streamed = false;
  const firstChange = takeFeedChanges(updates, 1).then((events) => {
    streamed = true;
    return events;
  });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  onTestFinished(() => log.mockRestore());
  database.$client
    .prepare('UPDATE feed_row SET payload = ? WHERE id = ?')
    .run('{}', thirdMessageRowId);
  sendAgentFeedChange(createTextAppendChange(thirdMessageRowId, 'Rejected'));
  sendAgentFeedChange(createTextAppendChange('missing-row', 'Rejected'));
  await vi.advanceTimersByTimeAsync(1000);
  expect(
    database.$client
      .prepare('SELECT max_revision FROM session WHERE id = ?')
      .get('session-1'),
  ).toMatchObject({ max_revision: 5 });
  expect(streamed).toBe(false);
  expect(log.mock.calls.map(([line]) => line)).toEqual([
    expect.stringContaining('could not read written row message-2#0'),
    expect.stringContaining('no row missing-row'),
  ]);
  sendAgentFeedChange(
    createOpenMessageChange(afterRejectionRowId, 'Still working'),
  );
  sendAgentFeedChange({
    type: 'patch',
    id: afterRejectionRowId,
    set: { state: 'settled' },
  });
  await vi.advanceTimersByTimeAsync(60);
  expect(await firstChange).toMatchObject([
    { type: upsertRowEvent, row: { id: afterRejectionRowId } },
  ]);
  expect(
    await createFeedRouterCaller().feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 1,
    }),
  ).toMatchObject({
    maxRevision: 7,
    rows: [{ id: afterRejectionRowId, content: [{ text: 'Still working' }] }],
  });
});

it.each(['prompt', 'agent', 'user'] as const)(
  'reads a stored %s title from the public Feed without opening the Session',
  async (titleSource) => {
    database.$client
      .prepare('UPDATE session SET title = ?, title_source = ? WHERE id = ?')
      .run('Session list reconnect investigation', titleSource, 'session-1');
    const connect = vi.fn<() => Promise<never>>(async () => {
      throw new Error('A stored snapshot must not launch the Agent');
    });
    feedTestHost = await startEngineTestHost({
      database,
      adapters: [{ ...createMockAdapter(), connect }],
    });
    const updates = await subscribe(null);
    expect((await updates.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        title: 'Session list reconnect investigation',
        titleSource,
        state: 'idle',
        changes: { files: 0, additions: 0, deletions: 0 },
      },
    });
    expect(connect).not.toHaveBeenCalled();
  },
);
