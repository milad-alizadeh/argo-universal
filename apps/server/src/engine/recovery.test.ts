import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { feedRow, project, session, turn } from '@repo/db/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ActorRefFrom, createActor, waitFor } from 'xstate';
import { type FeedRowWrite, writeJobs } from '../services/feed/writer-job';
import type { EngineMessage } from '../supervisor/engine-message';
import { engineMachine } from './machine';

let home: string;
let engine: ActorRefFrom<typeof engineMachine>;
let messages: EngineMessage[];
let rowsAtReady: ReturnType<typeof readRows>[];

const readRows = (database: Database) => ({
  turns: database.select().from(turn).orderBy(turn.id).all(),
  rows: database
    .select()
    .from(feedRow)
    .orderBy(feedRow.sessionId, feedRow.position)
    .all(),
  sessions: database.select().from(session).orderBy(session.id).all(),
});

const readStoredRows = () => {
  const database = openDatabase(join(home, 'argo.db'));
  try {
    return readRows(database);
  } finally {
    database.$client.close();
  }
};

const startEngine = async () => {
  engine = createActor(
    engineMachine.provide({
      actions: {
        log: () => {},
        sendToSupervisor: ({ context }, message) => {
          messages.push(message);
          if (message.type === 'ready' && context.database)
            rowsAtReady.push(readRows(context.database));
        },
      },
    }),
    {
      input: {
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
    (snapshot) =>
      snapshot.context.server !== null || snapshot.status === 'done',
  );
  return engine.getSnapshot();
};

// Actor.stop() cuts the lifecycle short; release the handles the killed process would lose.
const interruptEngine = async () => {
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

const toolRow = (
  id: string,
  position: number,
  revision: number,
  status: string,
  state: 'open' | 'settled' = 'open',
): FeedRowWrite => ({
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

beforeEach(async () => {
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
      ['session-1', 'session-2'].map((id) => ({
        id,
        projectId: 'project',
        agent: 'mock',
        checkoutPath: '/project',
        projectionVersion: 1,
        epoch: 3,
      })),
    )
    .run();
});

afterEach(async () => {
  if (engine.getSnapshot().status === 'active') await interruptEngine();
  rmSync(home, { recursive: true, force: true });
});

describe('Engine restart recovery', () => {
  it('repairs an interrupted Turn and its Feed before reporting ready', async () => {
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
          toolRow('pending-tool', 1, 4, 'pending'),
          toolRow('running-tool', 2, 6, 'in_progress'),
          toolRow('completed-tool', 3, 8, 'completed'),
          toolRow('failed-tool', 4, 10, 'failed'),
          toolRow('cancelled-tool', 5, 12, 'cancelled'),
          toolRow('settled-pending-tool', 6, 14, 'pending', 'settled'),
          toolRow('settled-completed-tool', 7, 16, 'completed', 'settled'),
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
      repaired.rows.map(({ id, state, revision, payload }) => ({
        id,
        state,
        revision,
        payload,
      })),
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
      ].map((id, index) =>
        expect.objectContaining({
          id,
          state: 'settled',
          revision: 22 + index,
          payload: expect.objectContaining({
            status:
              id === 'completed-tool'
                ? 'completed'
                : id === 'cancelled-tool'
                  ? 'cancelled'
                  : 'failed',
            rawInput: { path: '/project/file' },
          }),
        }),
      ),
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
      repaired.sessions.map(({ maxRevision, epoch }) => ({
        maxRevision,
        epoch,
      })),
    ).toEqual([
      { maxRevision: 27, epoch: 3 },
      { maxRevision: 6, epoch: 3 },
    ]);

    await interruptEngine();
    await startEngine();
    expect(rowsAtReady.at(-1)).toEqual(repaired);
  });

  it('rolls back every repair and fails without serving when a Session write fails', async () => {
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
        rows: [toolRow('tool', 0, 9, 'pending')],
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

  it('rejects and counts unrecognised Feed payloads without committing a partial repair', async () => {
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
        rows: [{ ...messageRow('future-payload', 0, 4), payloadVersion: 2 }],
      },
    ]);
    const before = readRows(database);
    await interruptEngine();
    messages = [];
    const failed = await startEngine();

    expect(failed.output).toEqual({ exitCode: 1 });
    expect(failed.context.failure).toContain(
      'unrecognised Feed rows: 2 (session-1/invalid-message, session-2/future-payload)',
    );
    expect(messages).toEqual([]);
    expect(readStoredRows()).toEqual(before);
  });
});
