import { randomUUID } from 'node:crypto';
import { appRouter } from '@repo/api';
import { unreachableServices } from '@repo/api/mocks';
import type {
  FeedChange,
  FeedSubscribeOutput,
  FeedSyncPoint,
  SessionUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { createMockAdapter, type MockAgentStream } from '@repo/mocks/agent';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import { type Actor, createActor, fromPromise, setup } from 'xstate';
import { insertSession, openTestDatabase } from '#mocks/database';
import { storedMessage as message } from '#mocks/feed';
import { createServerServices } from '../server-services';
import { registryMachine } from '../sessions/registry-machine';
import { sessionMachine } from '../sessions/session-machine';
import { createSystemService } from '../system';
import { feedMachine } from './feed-machine';
import { readWrittenRow, toFeedRowWrite } from './feed-row';
import { createFeedService } from './feed-service';
import { writeJobs } from './writer-job';
import { writerMachine } from './writer-machine';

let database: Database;
let runtimeDirectory: string;
let removeDatabase: () => void;
let host: Actor<ReturnType<typeof hostMachine>>;
let controller: AbortController;

// The Engine's writer and one Session's feed actor in one actor system, as the Engine will run them.
const hostMachine = (
  writer = writerMachine,
): import('xstate').StateMachine<
  import('xstate').MachineContext,
  import('xstate').AnyEventObject,
  {
    databaseWriter?: import('xstate').ActorRefFromLogic<typeof writerMachine>;
    feed?: import('xstate').ActorRefFromLogic<typeof feedMachine>;
    session?: import('xstate').ActorRefFromLogic<typeof sessionMachine>;
  },
  | { src: 'feed'; logic: typeof feedMachine; id: 'feed' }
  | { src: 'session'; logic: typeof sessionMachine; id: 'session' }
  | { src: 'writer'; logic: typeof writerMachine; id: 'databaseWriter' },
  never,
  never,
  never,
  Record<never, never>,
  string,
  import('xstate').NonReducibleUnknown,
  import('xstate').NonReducibleUnknown,
  import('xstate').EventObject,
  import('xstate').MetaObject,
  Record<never, never>,
  import('xstate').MetaObject
> =>
  setup({
    actors: {
      writer,
      feed: feedMachine,
      session: sessionMachine.provide({
        actors: {
          loadSession: fromPromise(
            (): Promise<import('../sessions/session-data').SessionData> =>
              new Promise((): void => {}),
          ),
        },
      }),
    },
  }).createMachine({
    invoke: [
      {
        id: 'session',
        src: 'session',
        input: (): import('xstate').InputFrom<typeof sessionMachine> => ({
          now: (): number => Date.now(),
          createId: randomUUID,
          database,
          runtimeDirectory,
          adapter: createMockAdapter(),
          kind: 'existing',
          sessionId: 'session-1',
        }),
      },
      {
        id: 'databaseWriter',
        systemId: 'databaseWriter',
        src: 'writer',
        input: (): { now: () => number; database: Database } => ({
          now: (): number => Date.now(),
          database,
        }),
      },
      {
        id: 'feed',
        src: 'feed',
        input: {
          now: (): number => Date.now(),
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

const startHost = (writer = writerMachine): void => {
  host = createActor(hostMachine(writer)).start();
};
const feedRef = ():
  | import('xstate').ActorRefFromLogic<typeof feedMachine>
  | undefined => host.getSnapshot().children.feed;

const caller = (): ReturnType<typeof appRouter.createCaller> =>
  appRouter.createCaller(
    {
      services: {
        ...unreachableServices(),
        system: createSystemService({ version: '0.0.0', startedAt: '' }),
        feed: createFeedService({
          database,
          findSession: (
            sessionId,
          ):
            | import('xstate').ActorRefFromLogic<typeof sessionMachine>
            | undefined =>
            host.getSnapshot().status === 'active' && sessionId === 'session-1'
              ? host.getSnapshot().children.session
              : undefined,
          findFeed: (
            sessionId,
          ):
            | import('xstate').ActorRefFromLogic<typeof feedMachine>
            | undefined => (sessionId === 'session-1' ? feedRef() : undefined),
          findWriter: (): ReturnType<typeof host.system.get> =>
            host.system.get('databaseWriter'),
        }),
      },
    },
    { signal: controller.signal },
  );

const sendChange = (change: FeedChange): void | undefined =>
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
): Promise<AsyncIterator<FeedSubscribeOutput, void>> =>
  (await caller().feed.subscribe({ sessionId, after }))[Symbol.asyncIterator]();
const take = async (
  iterator: AsyncIterator<FeedSubscribeOutput>,
  count: number,
): Promise<FeedSubscribeOutput[]> => {
  const values: FeedSubscribeOutput[] = [];
  while (values.length < count) {
    const next = await iterator.next();
    if (next.done) break;
    if (next.value.type !== 'snapshot') values.push(next.value);
  }
  return values;
};
const summary = (outputs: FeedSubscribeOutput[]): string[] =>
  outputs.map((output): string => {
    if (output.type === 'row.upsert')
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
      rows: [0, 1, 2, 3, 4].map(
        (position): import('./writer-job').FeedRowWrite =>
          toFeedRowWrite(message(position)),
      ),
      maxRevision: 5,
    },
  ]);
});

afterEach((): void => {
  controller.abort();
  host?.stop();
  removeDatabase();
  vi.useRealTimers();
});

describe('feed.page', (): void => {
  beforeEach((): void => startHost());

  it('reads the newest rows in position order', async (): Promise<void> => {
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

  it('reads the rows before a cursor', async (): Promise<void> => {
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

  it('answers a cursor from another epoch with the tail', async (): Promise<void> => {
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

  it('flags a tail request from another epoch', async (): Promise<void> => {
    expect(
      await caller().feed.page({
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

  it('fails with NOT_FOUND for an unknown Session', async (): Promise<void> => {
    await expect(
      caller().feed.page({ sessionId: 'session-9', direction: 'tail' }),
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

  it('reads rows that the feed actor wrote through the database writer', async (): Promise<void> => {
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

describe('feed.row', (): void => {
  beforeEach((): void => startHost());

  it('reads a stored row', async (): Promise<void> => {
    expect(
      await caller().feed.row({ sessionId: 'session-1', id: 'message-2#0' }),
    ).toEqual(message(2));
  });

  it('reads the newest version of an open row before it is written', async (): Promise<void> => {
    sendChange(openMessage('message-5#0'));
    sendChange(appendText('message-5#0', 'Hel'));

    expect(
      await caller().feed.row({ sessionId: 'session-1', id: 'message-5#0' }),
    ).toMatchObject({ revision: 7, content: [{ type: 'text', text: 'Hel' }] });
  });

  it('fails with NOT_FOUND for an unknown row', async (): Promise<void> => {
    await expect(
      caller().feed.row({ sessionId: 'session-1', id: 'message-9#0' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('feed.subscribe', (): void => {
  it('with no sync point, sends the rows not yet stored, then live changes', async (): Promise<void> => {
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

  it('catches up from a revision with stored rows and rows not yet written, without repeats', async (): Promise<void> => {
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

  it('catches up with rows the database writer still holds', async (): Promise<void> => {
    startHost(
      writerMachine.provide({
        actors: {
          writeBatch: fromPromise((): Promise<void> =>
            Promise.reject(new Error('database is locked')),
          ),
        },
        actions: { log: (): void => {} },
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

  it('resets a subscriber from another epoch, then sends the rows not yet stored', async (): Promise<void> => {
    startHost();
    sendChange(openMessage('message-5#0'));
    const updates = await subscribe({ epoch: 2, revision: 9 });

    expect(summary(await take(updates, 2))).toEqual([
      'reset',
      'upsert message-5#0 @6',
    ]);
  });

  it('sends stored rows and one snapshot before a closed Session stream ends', async (): Promise<void> => {
    startHost();
    host.stop();
    const updates = await subscribe({ epoch: 3, revision: 3 });

    expect(summary(await take(updates, 2))).toEqual([
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
    startHost();
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
  const root = createActor(
    setup({
      actors: { writer: writerMachine, sessions: registryMachine },
    }).createMachine({
      invoke: [
        {
          id: 'databaseWriter',
          systemId: 'databaseWriter',
          src: 'writer',
          input: {
            now: (): number => Date.now(),
            database,
          },
        },
        {
          id: 'sessions',
          src: 'sessions',
          input: {
            now: (): number => Date.now(),
            createId: randomUUID,
            database,
            runtimeDirectory,
            adapters: [adapter],
          },
        },
      ],
    }),
  ).start();
  onTestFinished((): void => {
    root.stop();
  });
  const sessions = root.getSnapshot().children.sessions;
  if (!sessions) throw new Error('No Session registry');
  const services = createServerServices({
    database,
    sessions,
    blobsFolder: '/unused',
    version: '1',
    startedAt: '',
  });
  await services.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start a Turn' }],
  });
  const updates = services.feed
    .subscribe(
      { sessionId: 'session-1', after: { epoch: 3, revision: 5 } },
      controller.signal,
    )
    [Symbol.asyncIterator]();
  const first = await updates.next();
  expect(first.done).toBe(false);
  if (!stream) throw new Error('No Agent stream');
  stream.send({
    type: 'agent.feed',
    change: openMessage('last-row', 'Last message'),
  });
  const sessionActor = sessions.getSnapshot().context.sessions['session-1'];
  if (!sessionActor) throw new Error('No registered Session');
  sessionActor.send({ type: 'session.close' });
  const events = await drainClosedFeed(updates);
  expect(events.at(-1)).toEqual({ type: 'closed', failure: null });
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'row.upsert',
      row: expect.objectContaining({ id: 'last-row' }),
    }),
  );
  expect(sessions.system.get('session:session-1')).toBeUndefined();
  const heldRevision = Math.max(
    5,
    ...events.flatMap((event): number[] => ('rev' in event ? [event.rev] : [])),
  );
  await services.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Continue the Session' }],
  });
  const resumed = services.feed
    .subscribe(
      {
        sessionId: 'session-1',
        after: { epoch: 3, revision: heldRevision },
      },
      controller.signal,
    )
    [Symbol.asyncIterator]();
  const resumedFirst = await resumed.next();
  expect(resumedFirst.done).toBe(false);
  if (!resumedFirst.value) throw new Error('No resumed Feed event');
  const nextEvents: FeedSubscribeOutput[] = [resumedFirst.value];
  stream.send({
    type: 'agent.feed',
    change: openMessage('next-row', 'Next message'),
  });
  for await (const event of {
    [Symbol.asyncIterator]: (): AsyncIterator<FeedSubscribeOutput, void> =>
      resumed,
  }) {
    nextEvents.push(event);
    if (event.type === 'row.upsert' && event.row.id === 'next-row') break;
  }
  expect(nextEvents).toContainEqual(
    expect.objectContaining({
      type: 'row.upsert',
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
  const root = createActor(
    setup({
      actors: { writer: writerMachine, sessions: registryMachine },
    }).createMachine({
      invoke: [
        {
          id: 'databaseWriter',
          systemId: 'databaseWriter',
          src: 'writer',
          input: {
            now: (): number => Date.now(),
            database,
          },
        },
        {
          id: 'sessions',
          src: 'sessions',
          input: {
            now: (): number => Date.now(),
            createId: randomUUID,
            database,
            runtimeDirectory,
            adapters: [createMockAdapter()],
          },
        },
      ],
    }),
  ).start();
  onTestFinished((): void => {
    root.stop();
  });
  const sessions = root.getSnapshot().children.sessions;
  if (!sessions) throw new Error('No Session registry');
  const services = createServerServices({
    database,
    sessions,
    blobsFolder: '/unused',
    version: '1',
    startedAt: '',
  });
  const events = await drainClosedFeed(
    services.feed
      .subscribe(
        { sessionId: 'session-1', after: { epoch: 3, revision: 3 } },
        controller.signal,
      )
      [Symbol.asyncIterator](),
  );
  expect(events.map((event): typeof event.type => event.type)).toEqual([
    'row.upsert',
    'row.upsert',
    'snapshot',
    'closed',
  ]);
  expect(events.at(-1)).toEqual({ type: 'closed', failure: null });
  expect(events[2]).toMatchObject({
    snapshot: { state: 'idle', configOptions: [], maxRevision: 5 },
  });
  expect(Object.keys(sessions.getSnapshot().context.sessions)).toEqual([]);
  expect(sessions.system.get('session:session-1')).toBeUndefined();
});

it('keeps a Subagent Feed stream open until its caller aborts', async (): Promise<void> => {
  startHost();
  insertSession(database, { id: 'subagent', parentSessionId: 'session-1' });
  const updates = await subscribe(null, 'subagent');
  expect((await updates.next()).value).toMatchObject({ type: 'snapshot' });
  const waiting = updates.next();
  controller.abort();
  expect(await waiting).toMatchObject({ done: true });
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
