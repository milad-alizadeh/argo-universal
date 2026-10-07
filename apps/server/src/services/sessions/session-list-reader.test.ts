import { turn } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createActor, fromPromise } from 'xstate';
import {
  countDatabaseReads,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import type { WriterJob } from '../feed/writer-job';
import { writerMachine } from '../feed/writer-machine';
import { registryMachine } from './registry-machine';
import { createSessionListReader } from './session-list-reader';

it('reads one Session with a thousand Turns without fetching its history', () => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  database
    .insert(turn)
    .values(
      Array.from({ length: 1000 }, (_, index) => ({
        id: `turn-${index}`,
        sessionId: 'session-1',
        status: 'ended' as const,
        startedAt: index,
        endedAt: index + 1,
        stopReason: 'end_turn' as const,
      })),
    )
    .run();
  const counted = countDatabaseReads(database);
  const sessions = createActor(registryMachine, {
    input: { database, runtimeDirectory: directory, adapters: [] },
  });
  const read = createSessionListReader({
    database: counted.database,
    sessions,
    writer: () => undefined,
  });
  expect(read.readRows(['session-1'])).toMatchObject([
    { information: { sessionId: 'session-1', status: 'idle' }, running: false },
  ]);
  expect(counted.metrics.queries).toBeLessThanOrEqual(5);
  expect(counted.metrics.rows).toBeLessThanOrEqual(3);
});

it('reads the existence of a running Subagent Turn without fetching its history', () => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
  database
    .insert(turn)
    .values(
      Array.from({ length: 1000 }, (_, index) => ({
        id: `child-turn-${index}`,
        sessionId: 'child-1',
        status: 'running' as const,
        startedAt: index,
      })),
    )
    .run();
  const counted = countDatabaseReads(database);
  const sessions = createActor(registryMachine, {
    input: { database, runtimeDirectory: directory, adapters: [] },
  });
  const reader = createSessionListReader({
    database: counted.database,
    sessions,
    writer: () => undefined,
  });
  expect(reader.readRows(['session-1'])).toMatchObject([
    {
      information: {
        sessionId: 'session-1',
        subagents: { total: 1, running: 1 },
      },
    },
  ]);
  expect(counted.metrics.queries).toBeLessThanOrEqual(5);
  expect(counted.metrics.rows).toBeLessThanOrEqual(3);
});

it('excludes only the Subagent with a malformed latest Turn from its healthy parent', () => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  onTestFinished(() => report.mockRestore());
  insertSession(database, { id: 'bad-child', parentSessionId: 'session-1' });
  insertSession(database, {
    id: 'healthy-child',
    parentSessionId: 'session-1',
  });
  database
    .insert(turn)
    .values([
      {
        id: 'bad-turn',
        sessionId: 'bad-child',
        status: 'running',
        startedAt: 2,
      },
      {
        id: 'healthy-turn',
        sessionId: 'healthy-child',
        status: 'running',
        startedAt: 1,
      },
    ])
    .run();
  database
    .update(turn)
    .set({ status: sql`'invalid'` })
    .where(eq(turn.id, 'bad-turn'))
    .run();
  const sessions = createActor(registryMachine, {
    input: { database, runtimeDirectory: directory, adapters: [] },
  });
  const reader = createSessionListReader({
    database,
    sessions,
    writer: () => undefined,
  });
  expect(reader.readRows(['session-1'])).toMatchObject([
    {
      information: {
        sessionId: 'session-1',
        status: 'idle',
        subagents: { total: 1, running: 1 },
      },
    },
  ]);
  expect(report).toHaveBeenCalledTimes(1);
});

it('resolves a changed queued Turn through its earlier unwritten insertion', () => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  const batch = Promise.withResolvers<void>();
  const writer = createActor(
    writerMachine.provide({
      actors: { writeBatch: fromPromise(() => batch.promise) },
    }),
    { input: { database } },
  ).start();
  onTestFinished(() => {
    writer.stop();
    batch.resolve();
  });
  const sessions = createActor(registryMachine, {
    input: { database, runtimeDirectory: directory, adapters: [] },
  });
  const reader = createSessionListReader({
    database,
    sessions,
    writer: () => writer,
  });
  writer.send({
    type: 'writer.write',
    job: {
      type: 'turnInsert',
      turn: {
        id: 'queued-turn',
        sessionId: 'session-1',
        status: 'running',
        startedAt: 1,
      },
    },
  });
  reader.readRows(['session-1']);
  const update: WriterJob = {
    type: 'turnUpdate',
    id: 'queued-turn',
    set: { status: 'ended', endedAt: 2, stopReason: 'end_turn' },
  };
  writer.send({ type: 'writer.write', job: update });
  expect(reader.sessionIdsForJobs([update])).toEqual(['session-1']);
});
