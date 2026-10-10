import type { AgentMessage, SessionUpdate } from '@repo/contracts';
import { SessionRecord, Turn } from '@repo/contracts';
import type { Database } from '@repo/db';
import { blob, blobRef, feedRow, session, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  onTestFinished,
} from 'vitest';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { writerDefaults } from '#mocks/writer';
import { hydrateStoredFeedRow, storedFeedColumns } from './feed-row';
import { type WriterJob, writeJobs } from './writer-job';
import { describeJob } from './writer-lost-jobs';
import { writerMachine } from './writer-machine';
import { readWriterProjection } from './writer-projection';

let database: Database;
let removeDatabase: () => void;

const row = (overrides: Partial<AgentMessage> = {}): AgentMessage => ({
  sessionId: 'session-1',
  id: 'row-1',
  position: 0,
  sessionUpdate: 'agent_message',
  revision: 1,
  turnId: 'turn-1',
  state: 'open',
  messageId: 'message-1',
  content: [],
  ...overrides,
});
const feedRows = (
  rows: SessionUpdate[],
  maxRevision: number,
): Extract<WriterJob, { type: 'feedRows' }> => ({
  type: 'feedRows',
  sessionId: 'session-1',
  rows,
  maxRevision,
});

const selectRows = (): (typeof feedRow.$inferSelect)[] =>
  database
    .select()
    .from(feedRow)
    .where(eq(feedRow.sessionId, 'session-1'))
    .orderBy(feedRow.position)
    .all();
const selectSession = (): typeof session.$inferSelect | undefined =>
  database.select().from(session).where(eq(session.id, 'session-1')).get();
const selectTurn = (): typeof turn.$inferSelect | undefined =>
  database.select().from(turn).where(eq(turn.id, 'turn-1')).get();

const submitWrites = (
  jobs: readonly WriterJob[],
): {
  writer: ReturnType<typeof createActor<typeof writerMachine>>;
  committed: Promise<void>;
} => {
  const writer = createActor(writerMachine, {
    input: { ...writerDefaults, database, now: () => 12000 },
  }).start();
  onTestFinished(() => {
    writer.stop();
  });
  const committed = Promise.withResolvers<void>();
  for (const [index, job] of jobs.entries())
    writer.send({
      type: 'writer.write',
      job,
      committed: index === jobs.length - 1 ? committed : undefined,
    });
  return { writer, committed: committed.promise };
};

beforeEach((): void => {
  ({ database, remove: removeDatabase } = openTestDatabase());
});

afterEach((): void => removeDatabase());

describe('writeJobs', (): void => {
  it('inserts Feed rows and sets the Session maxRevision', (): void => {
    writeJobs(database, [
      feedRows([row(), row({ id: 'row-2', position: 1, revision: 2 })], 2),
    ]);

    expect(selectRows()).toEqual([
      expect.objectContaining({
        sessionId: 'session-1',
        id: 'row-1',
        position: 0,
      }),
      expect.objectContaining({
        sessionId: 'session-1',
        id: 'row-2',
        position: 1,
      }),
    ]);
    expect(selectSession()?.maxRevision).toBe(2);
  });

  it('stamps activity when revisions advance and preserves it for repeated or older batches', (): void => {
    writeJobs(database, [{ ...feedRows([row()], 1), activityAt: 100 }]);
    expect(selectSession()).toMatchObject({ maxRevision: 1, activityAt: 100 });
    writeJobs(database, [{ ...feedRows([], 1), activityAt: 200 }]);
    writeJobs(database, [{ ...feedRows([], 0), activityAt: 300 }]);
    expect(selectSession()).toMatchObject({ maxRevision: 1, activityAt: 100 });
    writeJobs(database, [{ ...feedRows([], 2), activityAt: 400 }]);
    expect(selectSession()).toMatchObject({ maxRevision: 2, activityAt: 400 });
  });

  it('updates a Feed row it wrote before, by id, and keeps its position', (): void => {
    writeJobs(database, [feedRows([row()], 1)]);
    database
      .update(feedRow)
      .set({ sourceRef: { line: 4 }, searchText: 'Older' })
      .run();
    writeJobs(database, [
      feedRows(
        [
          row({
            position: 7,
            revision: 3,
            state: 'settled',
            content: [{ type: 'text', text: 'done' }],
          }),
        ],
        3,
      ),
    ]);

    expect(selectRows()).toEqual([
      expect.objectContaining({
        id: 'row-1',
        position: 0,
        revision: 3,
        state: 'settled',
        payload: {
          messageId: 'message-1',
          content: [{ type: 'text', text: 'done' }],
        },
        payloadVersion: 1,
        sourceRef: null,
        searchText: null,
      }),
    ]);
    expect(selectSession()?.maxRevision).toBe(3);
  });

  it('records the blobs a job names that are stored, once per Session', (): void => {
    database
      .insert(blob)
      .values({ id: 'image-1', mime: 'image/png', bytes: 3 })
      .run();
    const job = {
      ...feedRows(
        [{ ...row({ state: 'settled' }), sessionUpdate: 'user_message' }],
        1,
      ),
      blobIds: ['image-1', 'no-such-blob'],
    };

    writeJobs(database, [job, { ...job, maxRevision: 2 }]);

    expect(database.select().from(blobRef).all()).toEqual([
      { blobId: 'image-1', sessionId: 'session-1' },
    ]);
  });

  it('inserts a Turn, then updates it', (): void => {
    writeJobs(database, [
      {
        type: 'turnInsert',
        turn: { id: 'turn-1', sessionId: 'session-1', status: 'running' },
      },
      {
        type: 'turnUpdate',
        id: 'turn-1',
        set: { status: 'ended', stopReason: 'end_turn', endedAt: 5 },
      },
    ]);

    expect(selectTurn()).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
        status: 'ended',
        stopReason: 'end_turn',
        endedAt: 5,
      }),
    );
  });

  it('updates a session row', (): void => {
    writeJobs(database, [
      {
        type: 'sessionRowUpdate',
        id: 'session-1',
        set: { vendorSessionId: 'vendor-1', epoch: 2 },
      },
    ]);

    expect(selectSession()).toEqual(
      expect.objectContaining({ vendorSessionId: 'vendor-1', epoch: 2 }),
    );
  });

  it('commits the jobs in the order they arrive', (): void => {
    writeJobs(database, [
      feedRows([row({ revision: 1 })], 1),
      feedRows([row({ revision: 2, state: 'settled' })], 2),
      { type: 'sessionRowUpdate', id: 'session-1', set: { maxRevision: 9 } },
    ]);

    expect(selectRows()).toEqual([
      expect.objectContaining({ revision: 2, state: 'settled' }),
    ]);
    expect(selectSession()?.maxRevision).toBe(9);
  });

  it('commits nothing when one job fails', (): void => {
    const jobs: WriterJob[] = [
      feedRows([row()], 1),
      {
        type: 'turnInsert',
        turn: { id: 'turn-1', sessionId: 'no-such-session', status: 'running' },
      },
    ];

    expect(() => writeJobs(database, jobs)).toThrow();
    expect(selectRows()).toEqual([]);
    expect(selectSession()?.maxRevision).toBe(0);
    expect(selectTurn()).toBeUndefined();
  });
});

describe('describeJob', (): void => {
  it.each<[WriterJob, string]>([
    [
      feedRows([row(), row({ id: 'row-2' })], 2),
      'Feed rows row-1, row-2 of Session session-1 at maxRevision 2',
    ],
    [
      {
        type: 'turnInsert',
        turn: { id: 'turn-1', sessionId: 'session-1', status: 'running' },
      },
      'insert Turn turn-1 of Session session-1',
    ],
    [
      { type: 'turnUpdate', id: 'turn-1', set: { status: 'ended' } },
      'update Turn turn-1: status',
    ],
    [
      {
        type: 'sessionRowUpdate',
        id: 'session-1',
        set: { epoch: 1, vendorSessionId: 'vendor-1' },
      },
      'update Session session-1: epoch, vendorSessionId',
    ],
  ])('%j reads %s', (job, description): void => {
    expect(describeJob(job)).toBe(description);
  });
});

it('projects a queued Session row update exactly as its commit', async (): Promise<void> => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(12000);
  try {
    const before = SessionRecord.parse(selectSession());
    const original = structuredClone(before);
    const jobs: WriterJob[] = [
      {
        type: 'sessionRowUpdate',
        id: 'session-1',
        activityAt: 12000,
        set: {
          vendorSessionId: 'vendor-resume',
          epoch: 2,
          maxRevision: 3,
          activityAt: 999,
        },
      },
    ];
    const { writer, committed } = submitWrites(jobs);
    const projected = readWriterProjection(writer).session(before, 'session-1');
    await committed;
    const data = SessionRecord.omit({ createdAt: true, updatedAt: true });
    expect(data.parse(projected)).toEqual(data.parse(selectSession()));
    expect(projected).toMatchObject({ activityAt: 12000, maxRevision: 3 });
    expect(before).toEqual(original);
  } finally {
    clock.mockRestore();
  }
});

it('projects a queued Session insert exactly as its commit', async (): Promise<void> => {
  const jobs: WriterJob[] = [
    {
      type: 'sessionInsert',
      checkoutChoice: 'main',
      session: {
        id: 'session-2',
        projectId: 'project-1',
        agent: 'mock',
        checkoutPath: '/new',
        projectionVersion: 1,
        title: 'New Session',
      },
    },
  ];
  const original = structuredClone(jobs);
  const { writer, committed } = submitWrites(jobs);
  const projected = readWriterProjection(writer).session(
    undefined,
    'session-2',
  );
  await committed;
  const data = SessionRecord.omit({ createdAt: true, updatedAt: true });
  expect(data.parse(projected)).toEqual(
    data.parse(
      database.select().from(session).where(eq(session.id, 'session-2')).get(),
    ),
  );
  expect(jobs).toEqual(original);
});

it('projects a queued Turn insert exactly as its commit', async (): Promise<void> => {
  const jobs: WriterJob[] = [
    {
      type: 'turnInsert',
      turn: {
        id: 'turn-1',
        sessionId: 'session-1',
        status: 'running',
        startedAt: 12000,
      },
    },
  ];
  const { writer, committed } = submitWrites(jobs);
  const projected = readWriterProjection(writer).turns([]);
  await committed;
  expect(projected).toEqual([Turn.parse(selectTurn())]);
});

it('projects a queued Turn update exactly as its commit', async (): Promise<void> => {
  database
    .insert(turn)
    .values({
      id: 'turn-1',
      sessionId: 'session-1',
      status: 'running',
      startedAt: 100,
    })
    .run();
  const before = Turn.parse(selectTurn());
  const original = structuredClone(before);
  const jobs: WriterJob[] = [
    {
      type: 'turnUpdate',
      id: 'turn-1',
      set: {
        status: 'ended',
        stopReason: 'error',
        endedAt: 200,
        error: { code: 'interrupted', message: 'Stopped' },
      },
    },
  ];
  const { writer, committed } = submitWrites(jobs);
  const projected = readWriterProjection(writer).turns([before]);
  await committed;
  expect(projected).toEqual([Turn.parse(selectTurn())]);
  expect(before).toEqual(original);
});

it('projects queued Feed rows and their Session revision exactly as their commit', async (): Promise<void> => {
  const before = SessionRecord.parse(selectSession());
  const jobs: WriterJob[] = [
    {
      ...feedRows(
        [
          row({
            content: [{ type: 'text', text: 'Complete' }],
          }),
        ],
        1,
      ),
      activityAt: 100,
    },
  ];
  const { writer, committed } = submitWrites(jobs);
  const projection = readWriterProjection(writer);
  const projected = projection.session(before, 'session-1');
  const rows = projection.feed('session-1').rows;
  await committed;
  const data = SessionRecord.omit({ createdAt: true, updatedAt: true });
  expect(data.parse(projected)).toEqual(data.parse(selectSession()));
  expect(rows).toEqual(
    database
      .select(storedFeedColumns)
      .from(feedRow)
      .all()
      .map((row): SessionUpdate => hydrateStoredFeedRow('session-1', row)),
  );
});

it.each([
  {
    kind: 'Feed rows',
    job: {
      type: 'feedRows' as const,
      sessionId: 'session-1',
      rows: [],
      maxRevision: 2,
    },
    expected: { activityAt: 12000, startedAt: null },
  },
  {
    kind: 'Session revision',
    job: {
      type: 'sessionRowUpdate' as const,
      id: 'session-1',
      set: { maxRevision: 2 },
    },
    expected: { activityAt: 12000, startedAt: null },
  },
  {
    kind: 'Turn insert',
    job: {
      type: 'turnInsert' as const,
      turn: {
        id: 'turn-1',
        sessionId: 'session-1',
        status: 'running' as const,
      },
    },
    expected: { activityAt: 0, startedAt: 12000 },
  },
  {
    kind: 'supplied Feed stamp',
    job: {
      type: 'feedRows' as const,
      sessionId: 'session-1',
      rows: [],
      maxRevision: 2,
      activityAt: 100,
    },
    expected: { activityAt: 100, startedAt: null },
  },
  {
    kind: 'supplied Session stamp',
    job: {
      type: 'sessionRowUpdate' as const,
      id: 'session-1',
      set: { maxRevision: 2 },
      activityAt: 200,
    },
    expected: { activityAt: 200, startedAt: null },
  },
  {
    kind: 'supplied Turn stamp',
    job: {
      type: 'turnInsert' as const,
      turn: {
        id: 'turn-1',
        sessionId: 'session-1',
        status: 'running' as const,
        startedAt: 300,
      },
    },
    expected: { activityAt: 0, startedAt: 300 },
  },
])(
  'keeps $kind times equal across repeated reads and commit',
  async ({ job, expected }): Promise<void> => {
    const before = SessionRecord.parse(selectSession());
    const { writer, committed } = submitWrites([job]);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(20000);
    try {
      expect({
        activityAt: readWriterProjection(writer).session(before, 'session-1')
          ?.activityAt,
        startedAt: readWriterProjection(writer).turns([])[0]?.startedAt ?? null,
      }).toEqual(expected);
      clock.mockReturnValue(30000);
      expect({
        activityAt: readWriterProjection(writer).session(before, 'session-1')
          ?.activityAt,
        startedAt: readWriterProjection(writer).turns([])[0]?.startedAt ?? null,
      }).toEqual(expected);
      await committed;
      expect({
        activityAt: selectSession()?.activityAt,
        startedAt: selectTurn()?.startedAt ?? null,
      }).toEqual(expected);
    } finally {
      clock.mockRestore();
    }
  },
);
