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
import { sql } from 'drizzle-orm';
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
import { storedFeedColumns } from '../services/feed';
import { type FeedRowWrite, writeJobs } from '../services/feed';
import type { EngineMessage } from '../supervisor/engine-message';
import { engineMachine } from './machine';
import { recoverAfterRestart } from './recovery';

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
  turnId: 'running-turn',
  state: 'open',
  sessionUpdate: 'agent_message',
  payloadVersion: 1,
  payload: {
    messageId: id,
    content: [{ type: 'text', text: 'Partial reply' }],
  },
  searchText: 'Partial reply',
  sourceRef: { line: 7 },
});

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
    rawInput: { path: '/project/file' },
  },
});

beforeEach(async (): Promise<void> => {
  home = mkdtempSync(join(tmpdir(), 'argo-recovery-'));
  messages = [];
  rowsAtReady = [];
  await startEngine();
  const database =
    engine.getSnapshot().context.database ?? expect.unreachable();
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
    const database =
      engine.getSnapshot().context.database ?? expect.unreachable();
    writeJobs(database, [
      {
        type: 'turnInsert',
        turn: { id: 'running-turn', sessionId: 'session-1', status: 'running' },
      },
      {
        type: 'turnInsert',
        turn: {
          id: 'ended-turn',
          sessionId: 'session-1',
          status: 'ended',
          stopReason: 'end_turn',
          endedAt: 10,
        },
      },
      {
        type: 'feedRows',
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
            id: 'completed-tool',
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
            id: 'cancelled-tool',
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
      },
      {
        type: 'feedRows',
        sessionId: 'session-2',
        maxRevision: 5,
        rows: [messageRow('message', 0, 1)],
      },
    ]);
    const unchangedTurn = readRows(database).turns[0];
    const unchangedRow = readRows(database).rows[7];
    const interruptedAt = Date.now();
    await interruptEngine();
    messages = [];
    rowsAtReady = [];
    await startEngine();

    const repaired =
      rowsAtReady[0] ?? expect.unreachable('The Engine did not report ready');
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
        'completed-tool',
        'failed-tool',
        'cancelled-tool',
        'settled-pending-tool',
      ].map((id, index): ReturnType<typeof expect.objectContaining> => {
        let status = 'failed';
        if (id === 'completed-tool') status = 'completed';
        else if (id === 'cancelled-tool') status = 'cancelled';
        return expect.objectContaining({
          id,
          state: 'settled',
          revision: 22 + index,
          payload: expect.objectContaining({
            status,
            rawInput: { path: '/project/file' },
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
      turnId: 'running-turn',
      sourceRef: { line: 7 },
      searchText: 'Partial reply',
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
    const database =
      engine.getSnapshot().context.database ?? expect.unreachable();
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
    const database =
      engine.getSnapshot().context.database ?? expect.unreachable();
    writeJobs(database, [
      {
        type: 'turnInsert',
        turn: { id: 'running-turn', sessionId: 'session-1', status: 'running' },
      },
      {
        type: 'feedRows',
        sessionId: 'session-1',
        maxRevision: 9,
        rows: [
          toolRow({ id: 'tool', position: 0, revision: 9, status: 'pending' }),
        ],
      },
      {
        type: 'feedRows',
        sessionId: 'session-2',
        maxRevision: 4,
        rows: [messageRow('message', 0, 4)],
      },
    ]);
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
    const database =
      engine.getSnapshot().context.database ?? expect.unreachable();
    writeJobs(database, [
      {
        type: 'turnInsert',
        turn: { id: 'running-turn', sessionId: 'session-1', status: 'running' },
      },
      {
        type: 'feedRows',
        sessionId: 'session-1',
        maxRevision: 9,
        rows: [
          messageRow('valid-message', 0, 1),
          {
            ...messageRow('invalid-message', 1, 2),
            payload: { messageId: 'invalid-message', content: 'not an array' },
          },
        ],
      },
      {
        type: 'feedRows',
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
      },
    ]);
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
        rowsAtReady[0] ?? expect.unreachable('The Engine did not report ready');
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
        { id: 'invalid-message', revision: 11, state: 'settled' },
        { id: 'future-payload', revision: 5, state: 'settled' },
      ]);
      expect(repaired.rows[2]?.payload).toMatchObject({
        status: 'failed',
        rawInput: { path: '/project/file' },
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
