import { appRouter } from '@repo/api';
import type {
  FeedChange,
  FeedSubscribeOutput,
  FeedSyncPoint,
  SessionUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Actor, createActor, fromPromise, setup } from 'xstate';
import { insertSession, openTestDatabase } from '#mocks/database';
import { storedMessage as message } from '#mocks/feed';
import { createSystemService } from '../system';
import { feedMachine } from './feed-machine';
import { readWrittenRow, toFeedRowWrite } from './feed-row';
import { createFeedService } from './feed-service';
import { writeJobs } from './writer-job';
import { writerMachine } from './writer-machine';

let database: Database;
let removeDatabase: () => void;
let host: Actor<ReturnType<typeof hostMachine>>;
let controller: AbortController;

// The Engine's writer and one Session's feed actor in one actor system, as the Engine will run them.
const hostMachine = (writer = writerMachine) =>
  setup({ actors: { writer, feed: feedMachine } }).createMachine({
    invoke: [
      {
        id: 'databaseWriter',
        systemId: 'databaseWriter',
        src: 'writer',
        input: () => ({ database }),
      },
      {
        id: 'feed',
        src: 'feed',
        input: {
          sessionId: 'session-1',
          epoch: 3,
          maxRevision: 5,
          nextPosition: 5,
          findWrittenRow: (id: string): SessionUpdate | undefined =>
            readWrittenRow({
              database,
              writer: host.system.get('databaseWriter'),
              sessionId: 'session-1',
              id,
            }),
        },
      },
    ],
  });

const startHost = (writer = writerMachine) => {
  host = createActor(hostMachine(writer)).start();
};
const feedRef = () => host.getSnapshot().children.feed;

const caller = () =>
  appRouter.createCaller(
    {
      services: {
        system: createSystemService({ version: '0.0.0', startedAt: '' }),
        feed: createFeedService({
          database,
          findFeed: (sessionId) =>
            sessionId === 'session-1' ? feedRef() : undefined,
          findWriter: () => host.system.get('databaseWriter'),
        }),
      },
    },
    { signal: controller.signal },
  );

const sendChange = (change: FeedChange) =>
  feedRef()?.send({ type: 'feed.change', change, turnId: 'turn-1' });
const openMessage = (id: string, text = ''): FeedChange => ({
  type: 'upsert',
  update: {
    id,
    state: 'open',
    sessionUpdate: 'agent_message',
    messageId: id,
    content: [{ type: 'text', text }],
  },
});
const appendText = (id: string, text: string): FeedChange => ({
  type: 'append',
  id,
  field: 'content.0.text',
  text,
});

const subscribe = async (
  after: FeedSyncPoint | null,
  sessionId = 'session-1',
) =>
  (await caller().feed.subscribe({ sessionId, after }))[Symbol.asyncIterator]();
const take = async (
  iterator: AsyncIterator<FeedSubscribeOutput>,
  count: number,
) => {
  const values: FeedSubscribeOutput[] = [];
  while (values.length < count) {
    const next = await iterator.next();
    if (next.done) break;
    if (next.value.type !== 'snapshot') values.push(next.value);
  }
  return values;
};
const summary = (outputs: FeedSubscribeOutput[]) =>
  outputs.map((output) =>
    output.type === 'row.upsert'
      ? `upsert ${output.row.id} @${output.rev}`
      : output.type === 'row.append'
        ? `append ${output.id} +${output.text} at ${output.off} @${output.rev}`
        : output.type,
  );

beforeEach(() => {
  vi.useFakeTimers();
  controller = new AbortController();
  ({ database, remove: removeDatabase } = openTestDatabase({ epoch: 3 }));
  writeJobs(database, [
    {
      type: 'feedRows',
      sessionId: 'session-1',
      rows: [0, 1, 2, 3, 4].map((position) =>
        toFeedRowWrite(message(position)),
      ),
      maxRevision: 5,
    },
  ]);
});

afterEach(() => {
  controller.abort();
  host?.stop();
  removeDatabase();
  vi.useRealTimers();
});

describe('feed.page', () => {
  beforeEach(() => startHost());

  it('reads the newest rows in position order', async () => {
    expect(
      await caller().feed.page({
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

  it('reads the rows before a cursor', async () => {
    expect(
      await caller().feed.page({
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
      await caller().feed.page({
        sessionId: 'session-1',
        direction: 'before',
        cursor: 1,
        epoch: 3,
      }),
    ).toMatchObject({ rows: [message(0)], hasOlder: false, startCursor: 0 });
  });

  it('answers a cursor from another epoch with the tail', async () => {
    expect(
      await caller().feed.page({
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

  it('flags a tail request from another epoch', async () => {
    expect(
      await caller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        epoch: 2,
        limit: 1,
      }),
    ).toMatchObject({ epoch: 3, rows: [message(4)], staleCursor: true });
  });

  it('pages a Session with no rows', async () => {
    insertSession(database, { id: 'session-2' });

    expect(
      await caller().feed.page({ sessionId: 'session-2', direction: 'tail' }),
    ).toEqual({
      epoch: 0,
      maxRevision: 0,
      rows: [],
      hasOlder: false,
      startCursor: null,
      staleCursor: false,
    });
  });

  it('fails with NOT_FOUND for an unknown Session', async () => {
    await expect(
      caller().feed.page({ sessionId: 'session-9', direction: 'tail' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('keeps the place of a stored row that a change brings back', async () => {
    sendChange({
      type: 'patch',
      id: 'message-3#0',
      set: { messageId: 'plan-3' },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(
      await caller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 2,
      }),
    ).toMatchObject({
      maxRevision: 6,
      rows: [{ ...message(3), revision: 6, messageId: 'plan-3' }, message(4)],
    });
  });

  it('reads rows that the feed actor wrote through the database writer', async () => {
    sendChange(openMessage('message-5#0', 'Hi'));
    sendChange({
      type: 'patch',
      id: 'message-5#0',
      set: { state: 'settled' },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(
      await caller().feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 1,
      }),
    ).toMatchObject({
      maxRevision: 7,
      rows: [
        {
          id: 'message-5#0',
          position: 5,
          revision: 7,
          state: 'settled',
          content: [{ type: 'text', text: 'Hi' }],
        },
      ],
    });
  });
});

describe('feed.row', () => {
  beforeEach(() => startHost());

  it('reads a stored row', async () => {
    expect(
      await caller().feed.row({ sessionId: 'session-1', id: 'message-2#0' }),
    ).toEqual(message(2));
  });

  it('reads the newest version of an open row before it is written', async () => {
    sendChange(openMessage('message-5#0'));
    sendChange(appendText('message-5#0', 'Hel'));

    expect(
      await caller().feed.row({ sessionId: 'session-1', id: 'message-5#0' }),
    ).toMatchObject({ revision: 7, content: [{ type: 'text', text: 'Hel' }] });
  });

  it('fails with NOT_FOUND for an unknown row', async () => {
    await expect(
      caller().feed.row({ sessionId: 'session-1', id: 'message-9#0' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('feed.subscribe', () => {
  it('with no sync point, sends the rows not yet stored, then live changes', async () => {
    startHost();
    sendChange(openMessage('message-5#0', 'Hel'));
    const updates = await subscribe(null);

    expect(summary(await take(updates, 1))).toEqual(['upsert message-5#0 @6']);

    sendChange(appendText('message-5#0', 'lo'));
    sendChange(openMessage('message-6#0'));
    await vi.advanceTimersByTimeAsync(60);
    expect(summary(await take(updates, 2))).toEqual([
      'append message-5#0 +lo at 3 @7',
      'upsert message-6#0 @8',
    ]);
  });

  it('catches up from a revision with stored rows and rows not yet written, without repeats', async () => {
    startHost();
    sendChange(openMessage('message-5#0'));
    sendChange(appendText('message-5#0', 'Hel'));
    const updates = await subscribe({ epoch: 3, revision: 4 });

    expect(summary(await take(updates, 2))).toEqual([
      'upsert message-4#0 @5',
      'upsert message-5#0 @7',
    ]);

    sendChange(appendText('message-5#0', 'lo'));
    await vi.advanceTimersByTimeAsync(60);
    expect(summary(await take(updates, 1))).toEqual([
      'append message-5#0 +lo at 3 @8',
    ]);
  });

  it('catches up with rows the database writer still holds', async () => {
    startHost(
      writerMachine.provide({
        actors: {
          writeBatch: fromPromise(() =>
            Promise.reject(new Error('database is locked')),
          ),
        },
        actions: { log: () => {} },
      }),
    );
    sendChange(openMessage('message-5#0', 'Hi'));
    sendChange({ type: 'patch', id: 'message-5#0', set: { state: 'settled' } });
    await vi.advanceTimersByTimeAsync(0);
    expect(feedRef()?.getSnapshot().context.rows).toEqual({});

    const updates = await subscribe({ epoch: 3, revision: 5 });

    expect(await take(updates, 1)).toEqual([
      {
        type: 'row.upsert',
        rev: 7,
        row: expect.objectContaining({ id: 'message-5#0', state: 'settled' }),
      },
    ]);
  });

  it('resets a subscriber from another epoch, then sends the rows not yet stored', async () => {
    startHost();
    sendChange(openMessage('message-5#0'));
    const updates = await subscribe({ epoch: 2, revision: 9 });

    expect(summary(await take(updates, 2))).toEqual([
      'reset',
      'upsert message-5#0 @6',
    ]);
  });

  it('sends only stored rows for a closed Session, and ends when the signal aborts', async () => {
    startHost();
    host.stop();
    const updates = await subscribe({ epoch: 3, revision: 3 });

    expect(summary(await take(updates, 2))).toEqual([
      'upsert message-3#0 @4',
      'upsert message-4#0 @5',
    ]);
    expect((await updates.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: { state: 'idle' },
    });
    const next = updates.next();
    controller.abort();
    expect(await next).toMatchObject({ done: true });
  });

  it('fails with NOT_FOUND for an unknown Session', async () => {
    startHost();
    const updates = await subscribe(null, 'session-9');

    await expect(updates.next()).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
