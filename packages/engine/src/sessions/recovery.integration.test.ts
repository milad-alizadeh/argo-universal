import { randomUUID } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import {
  blob,
  blobRef,
  feedRow,
  project,
  session,
  turn,
} from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import { type ActorRefFrom, createActor, waitFor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { engineMachine, type EngineMessage } from '#mocks/engine';
import { type FeedRowWrite, storedFeedColumns } from '../feed';
import { writeJobs } from '../storage';
import { recoverAfterRestart } from './recovery';
import { TurnInsertJob } from './session-storage';

const runningTurnId = 'running-turn';
const partialReply = 'Partial reply';
const editedFilePath = '/project/file';
const completedToolId = 'completed-tool';
const cancelledToolId = 'cancelled-tool';
const invalidMessageId = 'invalid-message';

let home: string;
let engine: ActorRefFrom<typeof engineMachine>;
let messages: EngineMessage[];
let rowsAtReady: ReturnType<typeof readRows>[];

const readRows = (
  database: Database,
): {
  turns: (typeof turn.$inferSelect)[];
  rows: (typeof feedRow.$inferSelect)[];
  sessions: (typeof session.$inferSelect)[];
} => ({
  turns: database.select().from(turn).orderBy(turn.id).all(),
  rows: database
    .select()
    .from(feedRow)
    .orderBy(feedRow.sessionId, feedRow.position)
    .all(),
  sessions: database.select().from(session).orderBy(session.id).all(),
});

const readStoredRows = (): ReturnType<typeof readRows> => {
  const database = openDatabase(join(home, 'argo.db'));
  try {
    return readRows(database);
  } finally {
    database.$client.close();
  }
};

const startEngine = async (): Promise<
  ReturnType<typeof engine.getSnapshot>
> => {
  engine = createActor(
    engineMachine.provide({
      actions: {
        log: (): void => {},
        sendToSupervisor: ({ context }, message): void => {
          messages.push(message);
          if (message.type === 'ready' && context.database)
            rowsAtReady.push(readRows(context.database));
        },
      },
    }),
    {
      input: {
        now: (): number => Date.now(),
        createId: randomUUID,
        home,
        port: 0,
        version: 'test',
        startedAt: new Date().toISOString(),
        adapters: [],
      },
    },
  ).start();
  await waitFor(
    engine,
    (snapshot): boolean =>
      snapshot.context.server !== null || snapshot.status === 'done',
  );
  return engine.getSnapshot();
};

// Actor.stop() cuts the lifecycle short; release the handles the killed process would lose.
const interruptEngine = async (): Promise<void> => {
  const { database, server } = engine.getSnapshot().context;
  engine.stop();
  await server?.close();
  database?.$client.close();
};

const messageRow = (
  id: string,
  position: number,
  revision: number,
): FeedRowWrite => ({
  id,
  position,
  revision,
  turnId: runningTurnId,
  state: 'open',
  sessionUpdate: 'agent_message',
  payloadVersion: 1,
  payload: {
    messageId: id,
    content: [{ type: 'text', text: partialReply }],
  },
  searchText: partialReply,
  sourceRef: { line: 7 },
});

const fail = (message: string): never => {
  throw new Error(message);
};
const engineDatabase = (): Database =>
  engine.getSnapshot().context.database ?? fail('The Engine has no database');

const seedStoredFeedRows = (
  database: Database,
  input: { sessionId: string; maxRevision: number; rows: FeedRowWrite[] },
): void => {
  database
    .insert(feedRow)
    .values(
      input.rows.map((row): typeof feedRow.$inferInsert => ({
        ...row,
        sessionId: input.sessionId,
      })),
    )
    .run();
  database
    .update(session)
    .set({ maxRevision: input.maxRevision })
    .where(eq(session.id, input.sessionId))
    .run();
};

const toolRow = ({
  id,
  position,
  revision,
  status,
  state = 'open',
}: {
  id: string;
  position: number;
  revision: number;
  status: string;
  state?: 'open' | 'settled';
}): FeedRowWrite => ({
  ...messageRow(id, position, revision),
  state,
  sessionUpdate: 'tool_call_update',
  payload: {
    toolCallId: id,
    title: 'Read a file',
    kind: 'read',
    status,
    content: [],
    rawInput: { path: editedFilePath },
  },
});

beforeEach(async (): Promise<void> => {
  home = mkdtempSync(join(tmpdir(), 'argo-recovery-'));
  messages = [];
  rowsAtReady = [];
  await startEngine();
  const database = engineDatabase();
  database
    .insert(project)
    .values({ id: 'project', path: '/project', name: 'Project' })
    .run();
  database
    .insert(session)
    .values(
      ['session-1', 'session-2'].map(
        (
          id,
        ): Pick<
          typeof session.$inferSelect,
          | 'id'
          | 'projectId'
          | 'agent'
          | 'checkoutPath'
          | 'projectionVersion'
          | 'epoch'
        > => ({
          id,
          projectId: 'project',
          agent: 'mock',
          checkoutPath: '/project',
          projectionVersion: 1,
          epoch: 3,
        }),
      ),
    )
    .run();
});

afterEach(async (): Promise<void> => {
  if (engine.getSnapshot().status === 'active') await interruptEngine();
  rmSync(home, { recursive: true, force: true });
});

describe('Engine restart recovery', (): void => {
  it('repairs an interrupted Turn and its Feed before reporting ready', async (): Promise<void> => {
    const database = engineDatabase();
    writeJobs(database, [
      new TurnInsertJob({
        turn: { id: runningTurnId, sessionId: 'session-1', status: 'running' },
      }),
      new TurnInsertJob({
        turn: {
          id: 'ended-turn',
          sessionId: 'session-1',
          status: 'ended',
          stopReason: 'end_turn',
          endedAt: 10,
        },
      }),
    ]);
    seedStoredFeedRows(database, {
      sessionId: 'session-1',
      maxRevision: 20,
      rows: [
        messageRow('message', 0, 2),
        toolRow({
          id: 'pending-tool',
          position: 1,
          revision: 4,
          status: 'pending',
        }),
        toolRow({
          id: 'running-tool',
          position: 2,
          revision: 6,
          status: 'in_progress',
        }),
        toolRow({
          id: completedToolId,
          position: 3,
          revision: 8,
          status: 'completed',
        }),
        toolRow({
          id: 'failed-tool',
          position: 4,
          revision: 10,
          status: 'failed',
        }),
        toolRow({
          id: cancelledToolId,
          position: 5,
          revision: 12,
          status: 'cancelled',
        }),
        toolRow({
          id: 'settled-pending-tool',
          position: 6,
          revision: 14,
          status: 'pending',
          state: 'settled',
        }),
        toolRow({
          id: 'settled-completed-tool',
          position: 7,
          revision: 16,
          status: 'completed',
          state: 'settled',
        }),
      ],
    });
    seedStoredFeedRows(database, {
      sessionId: 'session-2',
      maxRevision: 5,
      rows: [messageRow('message', 0, 1)],
    });
    const unchangedTurn = readRows(database).turns[0];
    const unchangedRow = readRows(database).rows[7];
    const interruptedAt = Date.now();
    await interruptEngine();
    messages = [];
    rowsAtReady = [];
    await startEngine();

    const repaired = rowsAtReady[0] ?? fail('The Engine did not report ready');
    expect(repaired.turns[0]).toEqual(unchangedTurn);
    expect(repaired.turns[1]).toMatchObject({
      status: 'ended',
      stopReason: 'error',
      endedAt: expect.any(Number),
    });
    expect(repaired.turns[1]?.endedAt).toBeGreaterThanOrEqual(interruptedAt);
    expect(repaired.turns[1]?.endedAt).toBeLessThanOrEqual(Date.now());
    expect(
      repaired.rows.map(
        ({
          id,
          state,
          revision,
          payload,
        }): Pick<
          typeof feedRow.$inferSelect,
          'id' | 'state' | 'revision' | 'payload'
        > => ({
          id,
          state,
          revision,
          payload,
        }),
      ),
    ).toEqual([
      expect.objectContaining({
        id: 'message',
        state: 'settled',
        revision: 21,
        payload: messageRow('message', 0, 2).payload,
      }),
      ...[
        'pending-tool',
        'running-tool',
        completedToolId,
        'failed-tool',
        cancelledToolId,
        'settled-pending-tool',
      ].map((id, index): ReturnType<typeof expect.objectContaining> => {
        let status = 'failed';
        if (id === completedToolId) status = 'completed';
        else if (id === cancelledToolId) status = 'cancelled';
        return expect.objectContaining({
          id,
          state: 'settled',
          revision: 22 + index,
          payload: expect.objectContaining({
            status,
            rawInput: { path: editedFilePath },
          }),
        });
      }),
      expect.objectContaining({
        id: 'settled-completed-tool',
        state: 'settled',
        revision: 16,
      }),
      expect.objectContaining({ id: 'message', state: 'settled', revision: 6 }),
    ]);
    expect(repaired.rows[7]).toEqual(unchangedRow);
    expect(repaired.rows[0]).toMatchObject({
      position: 0,
      turnId: runningTurnId,
      sourceRef: { line: 7 },
      searchText: partialReply,
    });
    expect(
      repaired.sessions.map(
        ({
          maxRevision,
          epoch,
        }): Pick<typeof session.$inferSelect, 'maxRevision' | 'epoch'> => ({
          maxRevision,
          epoch,
        }),
      ),
    ).toEqual([
      { maxRevision: 27, epoch: 3 },
      { maxRevision: 6, epoch: 3 },
    ]);

    await interruptEngine();
    await startEngine();
    expect(rowsAtReady.at(-1)).toEqual(repaired);
  });

  it('deletes blobs no prompt refers to once they are over a day old', async (): Promise<void> => {
    const database = engineDatabase();
    const blobsFolder = join(home, 'blobs');
    mkdirSync(blobsFolder);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, createdAt] of [
      ['old-unused', dayAgo - 60_000],
      ['old-used', dayAgo - 60_000],
      ['new-unused', Date.now()],
    ] as const) {
      writeFileSync(join(blobsFolder, id), id);
      database
        .insert(blob)
        .values({ id, mime: 'image/png', bytes: 2, createdAt })
        .run();
    }
    database
      .insert(blobRef)
      .values({ blobId: 'old-used', sessionId: 'session-1' })
      .run();
    await interruptEngine();
    await startEngine();

    expect(readdirSync(blobsFolder).sort()).toEqual(['new-unused', 'old-used']);
  });

  it('rolls back every repair and fails without serving when a Session write fails', async (): Promise<void> => {
    const database = engineDatabase();
    writeJobs(database, [
      new TurnInsertJob({
        turn: { id: runningTurnId, sessionId: 'session-1', status: 'running' },
      }),
    ]);
    seedStoredFeedRows(database, {
      sessionId: 'session-1',
      maxRevision: 9,
      rows: [
        toolRow({ id: 'tool', position: 0, revision: 9, status: 'pending' }),
      ],
    });
    seedStoredFeedRows(database, {
      sessionId: 'session-2',
      maxRevision: 4,
      rows: [messageRow('message', 0, 4)],
    });
    database.$client.exec(`
      CREATE TRIGGER reject_recovery BEFORE UPDATE OF max_revision ON session
      WHEN NEW.id = 'session-2' BEGIN SELECT RAISE(ABORT, 'repair rejected'); END;
    `);
    const before = readRows(database);
    await interruptEngine();
    messages = [];
    const failed = await startEngine();

    expect(failed.value).toBe('failed');
    expect(failed.output).toEqual({ exitCode: 1 });
    expect(failed.context.failure).toContain(
      'could not recover after restart:',
    );
    expect(messages).toEqual([]);
    expect(readStoredRows()).toEqual(before);
  });

  it('settles and counts unrecognised Feed payloads before serving', async (): Promise<void> => {
    const database = engineDatabase();
    writeJobs(database, [
      new TurnInsertJob({
        turn: { id: runningTurnId, sessionId: 'session-1', status: 'running' },
      }),
    ]);
    seedStoredFeedRows(database, {
      sessionId: 'session-1',
      maxRevision: 9,
      rows: [
        messageRow('valid-message', 0, 1),
        {
          ...messageRow(invalidMessageId, 1, 2),
          payload: { messageId: invalidMessageId, content: 'not an array' },
        },
      ],
    });
    seedStoredFeedRows(database, {
      sessionId: 'session-2',
      maxRevision: 4,
      rows: [
        {
          ...toolRow({
            id: 'future-payload',
            position: 0,
            revision: 4,
            status: 'in_progress',
            state: 'settled',
          }),
          payloadVersion: 2,
        },
      ],
    });
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    try {
      await interruptEngine();
      messages = [];
      rowsAtReady = [];
      const restarted = await startEngine();
      expect(restarted.context.server).not.toBeNull();
      expect(restarted.context.failure).toBeNull();
      expect(messages).toContainEqual(
        expect.objectContaining({ type: 'ready' }),
      );
      const repaired =
        rowsAtReady[0] ?? fail('The Engine did not report ready');
      expect(
        repaired.rows.map(
          ({
            id,
            revision,
            state,
          }): Pick<
            typeof feedRow.$inferSelect,
            'id' | 'state' | 'revision'
          > => ({
            id,
            revision,
            state,
          }),
        ),
      ).toEqual([
        { id: 'valid-message', revision: 10, state: 'settled' },
        { id: invalidMessageId, revision: 11, state: 'settled' },
        { id: 'future-payload', revision: 5, state: 'settled' },
      ]);
      expect(repaired.rows[2]?.payload).toMatchObject({
        status: 'failed',
        rawInput: { path: editedFilePath },
      });
      expect(repaired.turns[0]).toMatchObject({
        status: 'ended',
        error: { code: 'interrupted' },
      });
      expect(
        repaired.sessions.map(({ maxRevision }): number => maxRevision),
      ).toEqual([11, 5]);
      expect(reported).toHaveBeenCalledWith(
        'recovery: rejected Feed shape (session-1/invalid-message) #1',
        expect.anything(),
      );
      expect(reported).toHaveBeenCalledWith(
        'recovery: rejected Feed shape (session-2/future-payload) #2',
        expect.anything(),
      );
    } finally {
      reported.mockRestore();
    }
  });
});

it.each(
  (['open', 'settled'] as const).flatMap(
    (
      state,
    ): [
      {
        state: 'open' | 'settled';
        column: typeof feedRow.payload;
        field: string;
      },
      {
        state: 'open' | 'settled';
        column: typeof feedRow.sourceRef;
        field: string;
      },
    ] => [
      { state, column: feedRow.payload, field: 'payload' },
      { state, column: feedRow.sourceRef, field: 'source reference' },
    ],
  ),
)(
  'keeps recovery available with unreadable $field JSON on a $state row',
  ({ state, column }): void => {
    const { database, remove } = openTestDatabase();
    onTestFinished(remove);
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    onTestFinished((): void => reported.mockRestore());
    database
      .insert(feedRow)
      .values({
        ...toolRow({
          id: 'bad-json',
          position: 0,
          revision: 1,
          status: 'in_progress',
          state,
        }),
        sessionId: 'session-1',
      })
      .run();
    database.run(
      sql`update ${feedRow} set ${sql.identifier(column.name)} = 'broken-json' where ${feedRow.id} = 'bad-json'`,
    );
    expect((): void => recoverAfterRestart(database)).not.toThrow();
    const repaired = database.select(storedFeedColumns).from(feedRow).get();
    expect(repaired).toMatchObject({
      id: 'bad-json',
      state: 'settled',
      revision: 1,
    });
    expect(reported).toHaveBeenCalledWith(
      'recovery: rejected Feed shape (session-1/bad-json) #1',
      expect.anything(),
    );
  },
);
