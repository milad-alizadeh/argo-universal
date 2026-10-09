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
import { waitFor } from 'xstate';
import { insertSession, openTestDatabase } from '#mocks/database';
import { storedMessage as message } from '#mocks/feed';
import { startRouterTestHost } from '#mocks/router';
import { appRouter } from '../../engine/router';
import { findSessionActor } from '../sessions';
import type { FeedActorRef } from './feed-machine';
import { toFeedRowWrite } from './feed-row';
import { writeJobs, type FeedRowWrite } from './writer-job';

const upsertRowEvent = 'row.upsert';
const agentFeedEvent = 'agent.feed';
const fifthMessageRowId = 'message-5#0';
const sessionFeedId = 'session:session-1';
const recoveredRowId = 'recovered-row';
const lastRowId = 'last-row';

let database: Database;
let runtimeDirectory: string;
let removeDatabase: () => void;
let feedTestHost: ReturnType<typeof startRouterTestHost>;
let controller: AbortController;

const startFeedTestHost = async (
  script: MockAgentScript = {},
  agent = 'mock',
): Promise<void> => {
  feedTestHost = startRouterTestHost({
    database,
    runtimeDirectory,
    adapters: [createMockAdapter(script, agent)],
  });
  feedTestHost.sessionRegistry.send({
    type: 'sessions.open',
    sessionId: 'session-1',
    agent,
  });
  const sessionActor = findSessionActor(
    feedTestHost.sessionRegistry.system,
    'session-1',
  );
  if (!sessionActor) throw new Error('Session did not open');
  await waitFor(sessionActor, (snapshot): boolean =>
    snapshot.can({ type: 'session.prompt', turnId: 'turn-1', content: [] }),
  );
};
const findFeedActor = (): FeedActorRef | undefined =>
  findSessionActor(
    feedTestHost.sessionRegistry.system,
    'session-1',
  )?.getSnapshot().children.feed;

const createFeedRouterCaller = (): ReturnType<typeof appRouter.createCaller> =>
  appRouter.createCaller(feedTestHost.context, { signal: controller.signal });

const sendChange = (change: FeedChange): void | undefined =>
  findFeedActor()?.send({ type: 'feed.change', change, turnId: 'turn-1' });
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
    if (output.type === 'row.append')
      return `append ${output.id} +${output.text} at ${output.off} @${output.rev}`;
    return output.type;
  });

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
      rows: [0, 1, 2, 3, 4].map((position): FeedRowWrite =>
        toFeedRowWrite(message(position)),
      ),
      maxRevision: 5,
    },
  ]);
  onTestFinished(removeDatabase);
});

afterEach(async (): Promise<void> => {
  controller.abort();
  database.$client.exec('DROP TRIGGER IF EXISTS hold_feed_writes');
  if (feedTestHost) {
    feedTestHost.sessionRegistry.send({ type: 'sessions.stopAll' });
    await waitFor(
      feedTestHost.sessionRegistry,
      (snapshot): boolean => snapshot.status === 'done',
    );
    feedTestHost.databaseWriter.send({ type: 'writer.drain' });
    await waitFor(
      feedTestHost.databaseWriter,
      (snapshot): boolean => snapshot.status === 'done',
    );
  }
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
    sendChange({
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
    sendChange(createOpenMessageChange(fifthMessageRowId, 'Hi'));
    sendChange({
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
        id: 'message-2#0',
      }),
    ).toEqual(message(2));
  });

  it('reads the newest version of an open row before it is written', async (): Promise<void> => {
    sendChange(createOpenMessageChange(fifthMessageRowId));
    sendChange(createTextAppendChange(fifthMessageRowId, 'Hel'));

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
    sendChange(createOpenMessageChange(fifthMessageRowId, 'Hel'));
    const updates = await subscribe(null);

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 1))).toEqual([
      'upsert message-5#0 @6',
    ]);

    sendChange(createTextAppendChange(fifthMessageRowId, 'lo'));
    sendChange(createOpenMessageChange('message-6#0'));
    await vi.advanceTimersByTimeAsync(60);
    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      'append message-5#0 +lo at 3 @7',
      'upsert message-6#0 @8',
    ]);
  });

  it('catches up from a revision with stored rows and rows not yet written, without repeats', async (): Promise<void> => {
    await startFeedTestHost();
    sendChange(createOpenMessageChange(fifthMessageRowId));
    sendChange(createTextAppendChange(fifthMessageRowId, 'Hel'));
    const updates = await subscribe({ epoch: 3, revision: 4 });

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      'upsert message-4#0 @5',
      'upsert message-5#0 @7',
    ]);

    sendChange(createTextAppendChange(fifthMessageRowId, 'lo'));
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
    sendChange(createOpenMessageChange(fifthMessageRowId, 'Hi'));
    sendChange({
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

  it('resets a subscriber from another epoch, then sends the rows not yet stored', async (): Promise<void> => {
    await startFeedTestHost();
    sendChange(createOpenMessageChange(fifthMessageRowId));
    const updates = await subscribe({ epoch: 2, revision: 9 });

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      'reset',
      'upsert message-5#0 @6',
    ]);
  });

  it('sends stored rows and one snapshot before a closed Session stream ends', async (): Promise<void> => {
    await startFeedTestHost();
    const sessionActor = findSessionActor(
      feedTestHost.sessionRegistry.system,
      'session-1',
    );
    if (!sessionActor) throw new Error('Session missing');
    sessionActor.send({ type: 'session.close' });
    await waitFor(
      sessionActor,
      (snapshot): boolean => snapshot.status === 'done',
    );
    const updates = await subscribe({ epoch: 3, revision: 3 });

    expect(summarizeFeedChanges(await takeFeedChanges(updates, 2))).toEqual([
      'upsert message-3#0 @4',
      'upsert message-4#0 @5',
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
  feedTestHost = startRouterTestHost({
    database,
    runtimeDirectory,
    adapters: [adapter],
  });
  const { sessionRegistry: sessions, context } = feedTestHost;
  await appRouter.createCaller(context).session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start a Turn' }],
  });
  const updates = (
    await appRouter
      .createCaller(context, { signal: controller.signal })
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
  const sessionActor = sessions.getSnapshot().context.sessions['session-1'];
  if (!sessionActor) throw new Error('No registered Session');
  sessionActor.send({ type: 'session.close' });
  const events = await drainClosedFeed(updates);
  expect(events.at(-1)).toEqual({ type: 'closed', failure: null });
  expect(events).toContainEqual(
    expect.objectContaining({
      type: upsertRowEvent,
      row: expect.objectContaining({ id: lastRowId }),
    }),
  );
  expect(sessions.system.get(sessionFeedId)).toBeUndefined();
  const heldRevision = Math.max(
    5,
    ...events.flatMap((event): number[] => ('rev' in event ? [event.rev] : [])),
  );
  await appRouter.createCaller(context).session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Continue the Session' }],
  });
  const resumed = (
    await appRouter
      .createCaller(context, { signal: controller.signal })
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
  feedTestHost = startRouterTestHost({ database, runtimeDirectory });
  const { sessionRegistry: sessions, context } = feedTestHost;
  const events = await drainClosedFeed(
    (
      await appRouter
        .createCaller(context, { signal: controller.signal })
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
  expect(Object.keys(sessions.getSnapshot().context.sessions)).toEqual([]);
  expect(sessions.system.get(sessionFeedId)).toBeUndefined();
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
    await appRouter
      .createCaller(feedTestHost.context, {
        signal: continuingController.signal,
      })
      .feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();
  await continuing.next();
  controller.abort();
  await pendingAbort;
  sendChange(createOpenMessageChange('remaining-reader', 'Still connected'));
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
  sendChange(createOpenMessageChange('snapshot-rejection'));
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
