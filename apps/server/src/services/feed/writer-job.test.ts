import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { feedRow, project, session, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  describeJob,
  type FeedRowWrite,
  type WriterJob,
  writeJobs,
} from './writer-job';

let directory: string;
let database: Database;

const row = (overrides: Partial<FeedRowWrite> = {}): FeedRowWrite => ({
  id: 'row-1',
  position: 0,
  sessionUpdate: 'agent_message',
  revision: 1,
  turnId: 'turn-1',
  state: 'open',
  payload: { messageId: 'message-1', content: [] },
  payloadVersion: 1,
  ...overrides,
});
const feedRows = (rows: FeedRowWrite[], maxRevision: number): WriterJob => ({
  type: 'feedRows',
  sessionId: 'session-1',
  rows,
  maxRevision,
});

const selectRows = () =>
  database
    .select()
    .from(feedRow)
    .where(eq(feedRow.sessionId, 'session-1'))
    .orderBy(feedRow.position)
    .all();
const selectSession = () =>
  database.select().from(session).where(eq(session.id, 'session-1')).get();
const selectTurn = () =>
  database.select().from(turn).where(eq(turn.id, 'turn-1')).get();

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'argo-writer-'));
  database = openDatabase(join(directory, 'argo.db'));
  database
    .insert(project)
    .values({ id: 'project-1', path: '/project', name: 'project' })
    .run();
  database
    .insert(session)
    .values({
      id: 'session-1',
      projectId: 'project-1',
      agent: 'mock',
      checkoutPath: '/project',
      projectionVersion: 1,
    })
    .run();
});

afterEach(() => {
  database.$client.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('writeJobs', () => {
  it('inserts Feed rows and sets the Session maxRevision', () => {
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

  it('updates a Feed row it wrote before, by id, and keeps its position', () => {
    writeJobs(database, [feedRows([row()], 1)]);
    writeJobs(database, [
      feedRows(
        [
          row({
            position: 7,
            revision: 3,
            state: 'settled',
            payload: { messageId: 'message-1', content: ['done'] },
            sourceRef: { line: 4 },
            searchText: 'done',
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
        payload: { messageId: 'message-1', content: ['done'] },
        sourceRef: { line: 4 },
        searchText: 'done',
      }),
    ]);
    expect(selectSession()?.maxRevision).toBe(3);
  });

  it('inserts a Turn, then updates it', () => {
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

  it('updates a session row', () => {
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

  it('commits the jobs in the order they arrive', () => {
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

  it('commits nothing when one job fails', () => {
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

describe('describeJob', () => {
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
  ])('%j reads %s', (job, description) => {
    expect(describeJob(job)).toBe(description);
  });
});
