import type { PromptRequest } from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import type {
  FeedChange,
  FeedSubscribeOutput,
  FeedSyncPoint,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
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
import {
  createFeedModuleCaller,
  startFeedModuleTestHost,
} from '#mocks/feed-module';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { appRouter } from '../../engine/router';
import { writeJobs } from '../../storage';
import { FeedRowsJob } from './feed-storage';
import type { FeedActorRef } from './index';

const afterRejectionRowId = 'after-rejection';
const storedBeforeStreamText = 'Stored first';
const overlappingTimersRowId = 'overlapping-timers';
const thirdMessageRowId = 'message-2#0';
const appendRowEvent = 'row.append';
const upsertRowEvent = 'row.upsert';
const fifthMessageRowId = 'message-5#0';
const recoveredRowId = 'recovered-row';
const lastRowId = 'last-row';
const teardownRowId = 'teardown-row';
const fourthStoredUpsert = 'upsert message-4#0 @5';
const dropFeedWriteTrigger = 'DROP TRIGGER hold_feed_writes';
const queuedToolActivity = 'Reading files';
const waitForCancelStep = 'wait-for-cancel';

let database: Database;
let runtimeDirectory: string;
let removeDatabase: () => void;
let feedTestHost: Awaited<ReturnType<typeof startEngineTestHost>>;
let controller: AbortController;
let scriptedAgent: ReturnType<typeof scriptedEngineInput>['agent'];
let appliedFeed: FeedActorRef | undefined;

const startFeedTestHost = async (
  scenario: ScriptedScenario = { steps: [] },
  agent = 'mock',
): Promise<void> => {
  const moduleHost = await startFeedModuleTestHost({
    database,
    runtimeDirectory,
    scenario,
    agent,
  });
  feedTestHost = moduleHost;
  scriptedAgent = moduleHost.agent;
  appliedFeed = moduleHost.feed;
};

const createFeedRouterCaller = (): ReturnType<typeof appRouter.createCaller> =>
  createFeedModuleCaller(feedTestHost, appliedFeed, controller.signal);

const applyFeedChange = (change: FeedChange): void => {
  if (!appliedFeed) throw new Error('Feed module is not started');
  const turn = database.$client
    .prepare('SELECT id FROM turn WHERE session_id = ? AND status = ?')
    .get('session-1', 'running');
  appliedFeed.send({
    type: 'feed.change',
    change,
    turnId: typeof turn?.id === 'string' ? turn.id : null,
  });
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
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: longHistoryPositions
        .slice(5)
        .map((position): ReturnType<typeof message> => message(position)),
      maxRevision: longHistoryRows,
    }),
  ]);

beforeEach((): void => {
  vi.useFakeTimers();
  appliedFeed = undefined;
  controller = new AbortController();
  ({
    database,
    directory: runtimeDirectory,
    remove: removeDatabase,
  } = openTestDatabase({ epoch: 3 }));
  writeJobs(database, [
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: [0, 1, 2, 3, 4].map((position): ReturnType<typeof message> =>
        message(position),
      ),
      maxRevision: 5,
    }),
  ]);
  onTestFinished(removeDatabase);
});

afterEach(async (): Promise<void> => {
  controller.abort();
  database.$client.exec('DROP TRIGGER IF EXISTS hold_feed_writes');
  appliedFeed?.send({ type: 'feed.flush' });
  if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0);
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
    applyFeedChange({
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
    applyFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hi'));
    applyFeedChange({
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
    applyFeedChange(createOpenMessageChange(fifthMessageRowId));
    applyFeedChange(createTextAppendChange(fifthMessageRowId, 'Hel'));

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
    applyFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hel'));
    const updates = await subscribe(null);

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 1))).toEqual([
      'upsert message-5#0 @6',
    ]);

    applyFeedChange(createTextAppendChange(fifthMessageRowId, 'lo'));
    applyFeedChange(createOpenMessageChange('message-6#0'));
    await vi.advanceTimersByTimeAsync(60);
    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      'append message-5#0 +lo at 3 @7',
      'upsert message-6#0 @8',
    ]);
  });

  it('catches up from a revision with stored rows and rows not yet written, without repeats', async (): Promise<void> => {
    await startFeedTestHost();
    applyFeedChange(createOpenMessageChange(fifthMessageRowId));
    applyFeedChange(createTextAppendChange(fifthMessageRowId, 'Hel'));
    const updates = await subscribe({ epoch: 3, revision: 4 });

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      fourthStoredUpsert,
      'upsert message-5#0 @7',
    ]);

    applyFeedChange(createTextAppendChange(fifthMessageRowId, 'lo'));
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
    applyFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hi'));
    applyFeedChange({
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
    const { id, state, sessionUpdate, messageId, content } = message(5, 6);
    applyFeedChange({
      type: 'upsert',
      update: { id, state, sessionUpdate, messageId, content },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(
      await createFeedRouterCaller().feed.row({
        sessionId: 'session-1',
        id: fifthMessageRowId,
      }),
    ).toEqual({ ...message(5, 6), turnId: null });
    database.$client.exec(dropFeedWriteTrigger);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      await createFeedRouterCaller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 1,
      }),
    ).toMatchObject({
      rows: [{ ...message(5, 6), turnId: null }],
      maxRevision: 6,
    });
  });

  it('reconnects across stored, queued and live revisions before retry commits', async (): Promise<void> => {
    await startFeedTestHost();
    database.$client
      .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
    applyFeedChange(createOpenMessageChange(fifthMessageRowId, 'Queued'));
    applyFeedChange({
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
    applyFeedChange({
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
    applyFeedChange(createOpenMessageChange('live-row'));
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

  it.each([
    { copy: 'stored', holdWrites: false },
    { copy: 'queued', holdWrites: true },
  ])(
    'sends a row that changed between catch-up pages once, whole, at its newest $copy revision',
    async ({ holdWrites }): Promise<void> => {
      storeLongHistory();
      await startFeedTestHost();
      if (holdWrites)
        database.$client
          .exec(`CREATE TRIGGER hold_feed_writes BEFORE UPDATE ON feed_row
        BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
      const updates = await subscribe({ epoch: 3, revision: 0 });
      const firstPage = await takeFeedChanges(updates, 200);
      applyFeedChange({
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
    },
  );

  it('resets a subscriber from another epoch, then sends the rows not yet stored', async (): Promise<void> => {
    await startFeedTestHost();
    applyFeedChange(createOpenMessageChange(fifthMessageRowId));
    const updates = await subscribe({ epoch: 2, revision: 9 });

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      'reset',
      'upsert message-5#0 @6',
    ]);
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
  const input = scriptedEngineInput({
    steps: [{ type: waitForCancelStep }],
    sessionIds: ['vendor-1'],
  });
  scriptedAgent = input.agent;
  feedTestHost = await startEngineTestHost({
    database,
    runtimeDirectory,
    ...input,
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
  const process = requireScriptedProcessAt(scriptedAgent.processes);
  await process.play(
    feedScenario([
      {
        sessionUpdate: 'agent_message_chunk',
        messageId: lastRowId,
        content: { type: 'text', text: 'Last message' },
      },
    ]).steps,
    'vendor-1',
  );
  const closing = feedTestHost.caller.session.close({ sessionId: 'session-1' });
  const events = await drainClosedFeed(updates);
  expect(events.at(-1)).toEqual({ type: 'closed', failure: null });
  expect(events).toContainEqual(
    expect.objectContaining({
      type: upsertRowEvent,
      row: expect.objectContaining({ messageId: lastRowId }),
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
  await requireScriptedProcessAt(scriptedAgent.processes, 1).play(
    feedScenario([
      {
        sessionUpdate: 'agent_message_chunk',
        messageId: 'next-row',
        content: { type: 'text', text: 'Next message' },
      },
    ]).steps,
    'vendor-1',
  );
  for await (const event of {
    [Symbol.asyncIterator]: (): AsyncIterator<FeedSubscribeOutput, void> =>
      resumed,
  }) {
    nextEvents.push(event);
    if (
      event.type === upsertRowEvent &&
      event.row.sessionUpdate === 'agent_message' &&
      event.row.messageId === 'next-row'
    )
      break;
  }
  expect(nextEvents).toContainEqual(
    expect.objectContaining({
      type: upsertRowEvent,
      row: expect.objectContaining({ messageId: 'next-row' }),
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
  const input = scriptedEngineInput();
  feedTestHost = await startEngineTestHost({
    database,
    runtimeDirectory,
    ...input,
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
    snapshot: {
      state: 'idle',
      configOptions: [],
      maxRevision: 5,
      title: '',
      titleSource: 'prompt',
      checkout: { type: 'main', path: '/project', branch: null },
    },
  });
  expect(input.agent.processes).toHaveLength(0);
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
    await createFeedModuleCaller(
      feedTestHost,
      appliedFeed,
      continuingController.signal,
    ).feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();
  await continuing.next();
  controller.abort();
  await pendingAbort;
  applyFeedChange(
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
  applyFeedChange(createOpenMessageChange('snapshot-rejection'));
  await expect(updates.next()).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unrecognised Session row',
  });
});

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

it('persists the final buffered ACP Feed row during real Engine shutdown', async (): Promise<void> => {
  vi.useRealTimers();
  const entered = Promise.withResolvers<PromptRequest>();
  const input = scriptedEngineInput({
    steps: [],
    responses: {
      'session/prompt': [
        { received: entered, steps: [{ type: waitForCancelStep }] },
      ],
    },
  });
  feedTestHost = await startEngineTestHost({ database, ...input });
  await feedTestHost.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start' }],
  });
  await entered.promise;
  const updates = (
    await feedTestHost
      .createCaller({ signal: controller.signal })
      .feed.subscribe({
        sessionId: 'session-1',
        after: { epoch: 3, revision: 5 },
      })
  )[Symbol.asyncIterator]();
  await updates.next();
  await requireScriptedProcessAt(input.agent.processes).play(
    feedScenario([
      {
        sessionUpdate: 'agent_message_chunk',
        messageId: teardownRowId,
        content: { type: 'text', text: 'Before shutdown' },
      },
    ]).steps,
    'owned-1',
  );
  const buffered = await takeFeedChanges(updates, 1);
  expect(buffered).toMatchObject([
    { type: 'row.upsert', row: { messageId: teardownRowId, state: 'open' } },
  ]);
  expect(
    database.$client
      .prepare(
        "SELECT id FROM feed_row WHERE json_extract(payload, '$.messageId') = ?",
      )
      .get(teardownRowId),
  ).toBeUndefined();
  await feedTestHost.stop();
  expect(
    database.$client
      .prepare(
        "SELECT payload FROM feed_row WHERE json_extract(payload, '$.messageId') = ?",
      )
      .get(teardownRowId),
  ).toMatchObject({ payload: expect.stringContaining('Before shutdown') });
});

it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'keeps %s queued Tool-call headers visible before persistence',
  async (agent): Promise<void> => {
    await startFeedTestHost({ steps: [{ type: waitForCancelStep }] }, agent);
    await createFeedRouterCaller().session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Read queued file' }],
    });
    database.$client
      .exec(`CREATE TRIGGER hold_feed_writes BEFORE INSERT ON feed_row
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END`);
    await requireScriptedProcessAt(scriptedAgent.processes).play(
      feedScenario([
        {
          sessionUpdate: 'tool_call',
          toolCallId: 'queued-tool',
          title: 'Read queued file',
          kind: 'read',
          status: 'in_progress',
          content: [],
        },
      ]).steps,
      'vendor-1',
    );
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      (await createFeedRouterCaller().session.list({ archived: false }))
        .sessions,
    ).toMatchObject([{ sessionId: 'session-1', activity: queuedToolActivity }]);
    const updates = (
      await feedTestHost
        .createCaller({ signal: controller.signal })
        .feed.subscribe({
          sessionId: 'session-1',
          after: { epoch: 3, revision: 6 },
        })
    )[Symbol.asyncIterator]();
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
  let received = false;
  const next = takeFeedChanges(updates, 2).then((events) => {
    received = true;
    return events;
  });
  applyFeedChange(createOpenMessageChange('timed-row'));
  await vi.advanceTimersByTimeAsync(30);
  applyFeedChange(createTextAppendChange('timed-row', 'Hello'));
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
  applyFeedChange(createOpenMessageChange(overlappingTimersRowId));
  await vi.advanceTimersByTimeAsync(950);
  await takeFeedChanges(updates, 1);
  applyFeedChange(
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
  applyFeedChange(createTextAppendChange(thirdMessageRowId, 'Rejected'));
  applyFeedChange(createTextAppendChange('missing-row', 'Rejected'));
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
  applyFeedChange(
    createOpenMessageChange(afterRejectionRowId, 'Still working'),
  );
  applyFeedChange({
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
    const input = scriptedEngineInput();
    feedTestHost = await startEngineTestHost({ database, ...input });
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
    expect(input.agent.processes).toHaveLength(0);
  },
);
