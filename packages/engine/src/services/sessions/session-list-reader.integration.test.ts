import { randomUUID } from 'node:crypto';
import { turn } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createActor, waitFor } from 'xstate';
import {
  countDatabaseReads,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { writerMachine } from '../../storage';
import { registryMachine } from './registry-machine';
import { createSessionListReader } from './session-list-reader';
import {
  SessionRowUpdateJob,
  TurnInsertJob,
  TurnUpdateJob,
} from './session-storage';
import { onWriterChange, type WriterChange } from './writer-changes';

const writeEvent = 'writer.write';
const queuedTurnId = 'queued-turn';

it('reads one Session with a thousand Turns without fetching its history', (): void => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  database
    .insert(turn)
    .values(
      Array.from(
        { length: 1000 },
        (
          _,
          index,
        ): Pick<
          typeof turn.$inferSelect,
          'id' | 'sessionId' | 'status' | 'startedAt' | 'endedAt' | 'stopReason'
        > => ({
          id: `turn-${index}`,
          sessionId: 'session-1',
          status: 'ended' as const,
          startedAt: index,
          endedAt: index + 1,
          stopReason: 'end_turn' as const,
        }),
      ),
    )
    .run();
  const counted = countDatabaseReads(database);
  const sessions = createActor(registryMachine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      database,
      runtimeDirectory: directory,
      adapters: [],
    },
  });
  const read = createSessionListReader({
    database: counted.database,
    sessions,
    writer: (): undefined => undefined,
  });
  expect(read.readRows(['session-1'])).toMatchObject([
    { information: { sessionId: 'session-1', status: 'idle' }, running: false },
  ]);
  expect(counted.metrics.queries).toBeLessThanOrEqual(5);
  expect(counted.metrics.rows).toBeLessThanOrEqual(3);
});

it('reads the existence of a running Subagent Turn without fetching its history', (): void => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
  database
    .insert(turn)
    .values(
      Array.from(
        { length: 1000 },
        (
          _,
          index,
        ): Pick<
          typeof turn.$inferSelect,
          'id' | 'sessionId' | 'status' | 'startedAt'
        > => ({
          id: `child-turn-${index}`,
          sessionId: 'child-1',
          status: 'running' as const,
          startedAt: index,
        }),
      ),
    )
    .run();
  const counted = countDatabaseReads(database);
  const sessions = createActor(registryMachine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      database,
      runtimeDirectory: directory,
      adapters: [],
    },
  });
  const reader = createSessionListReader({
    database: counted.database,
    sessions,
    writer: (): undefined => undefined,
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

it('excludes only the Subagent with a malformed latest Turn from its healthy parent', (): void => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  const report = vi
    .spyOn(console, 'error')
    .mockImplementation((): undefined => undefined);
  onTestFinished((): void => report.mockRestore());
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
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      database,
      runtimeDirectory: directory,
      adapters: [],
    },
  });
  const reader = createSessionListReader({
    database,
    sessions,
    writer: (): undefined => undefined,
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

it.each(['session-1', 'child-1'])(
  'publishes the effective %s Turn and parent from Writer changes before its insert commits',
  async (sessionId): Promise<void> => {
    const { database, directory, remove } = openTestDatabase();
    onTestFinished(remove);
    insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
    database.$client.exec(
      "CREATE TRIGGER reject_turn BEFORE INSERT ON turn BEGIN SELECT RAISE(ABORT, 'locked'); END",
    );
    const writer = createActor(writerMachine, {
      input: { database, now: () => 1000, log: () => {} },
    }).start();
    onTestFinished(() => {
      writer.stop();
    });
    const sessions = createActor(registryMachine, {
      input: {
        now: () => 1000,
        createId: randomUUID,
        database,
        runtimeDirectory: directory,
        adapters: [],
      },
    });
    const reader = createSessionListReader({
      database,
      sessions,
      writer: () => writer,
    });
    reader.readRows();
    const observed: { ids: string[]; running: boolean; subagents: number }[] =
      [];
    const listener = onWriterChange(writer, (change: WriterChange) => {
      const ids = reader.relatedSessionIds(reader.sessionIdsForChanges(change));
      const parent = reader
        .readRows(ids)
        .find((row) => row.information.sessionId === 'session-1');
      observed.push({
        ids,
        running: parent?.running ?? false,
        subagents: parent?.information.subagents.running ?? 0,
      });
    });
    onTestFinished(() => listener.unsubscribe());
    writer.send({
      type: writeEvent,
      job: new TurnInsertJob({
        turn: { id: queuedTurnId, sessionId, status: 'running', startedAt: 1 },
      }),
    });
    await waitFor(writer, (snapshot) => snapshot.matches('waitingToRetry'));
    writer.send({
      type: writeEvent,
      job: new TurnUpdateJob({
        id: queuedTurnId,
        set: { status: 'ended', endedAt: 2, stopReason: 'end_turn' },
      }),
    });
    expect(observed).toEqual([
      {
        ids:
          sessionId === 'session-1' ? ['session-1'] : ['child-1', 'session-1'],
        running: sessionId === 'session-1',
        subagents: sessionId === 'child-1' ? 1 : 0,
      },
      {
        ids:
          sessionId === 'session-1' ? ['session-1'] : ['child-1', 'session-1'],
        running: false,
        subagents: 0,
      },
    ]);
    expect(database.select().from(turn).all()).toEqual([]);
    database.$client.exec('DROP TRIGGER reject_turn');
    writer.send({ type: 'writer.drain' });
    await waitFor(writer, (snapshot) => snapshot.status === 'done');
    expect(database.select().from(turn).all()).toMatchObject([
      { id: queuedTurnId, status: 'ended' },
    ]);
    expect(observed).toHaveLength(3);
    expect(observed[2]).toEqual(observed[1]);
  },
);

it('rejects a malformed stored Session before a pending patch can replace its invalid value', async (): Promise<void> => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  database.$client.exec(
    "UPDATE session SET title_source = 'unrecognised'; CREATE TRIGGER reject_patch BEFORE UPDATE ON session BEGIN SELECT RAISE(ABORT, 'locked'); END",
  );
  const writer = createActor(writerMachine, {
    input: { database, now: () => 1000, log: () => {} },
  }).start();
  onTestFinished(() => {
    writer.stop();
  });
  const sessions = createActor(registryMachine, {
    input: {
      now: () => 1000,
      createId: randomUUID,
      database,
      runtimeDirectory: directory,
      adapters: [],
    },
  });
  const report = vi.spyOn(console, 'error').mockImplementation(() => {});
  const reader = createSessionListReader({
    database,
    sessions,
    writer: () => writer,
  });
  writer.send({
    type: writeEvent,
    job: new SessionRowUpdateJob({
      id: 'session-1',
      set: { titleSource: 'agent' },
    }),
  });
  await waitFor(writer, (snapshot) => snapshot.matches('waitingToRetry'));
  expect(reader.readRows(['session-1'])).toEqual([]);
  expect(report).toHaveBeenCalledTimes(1);
  database.$client.exec('DROP TRIGGER reject_patch');
  writer.send({ type: 'writer.drain' });
  await waitFor(writer, (snapshot) => snapshot.status === 'done');
});
