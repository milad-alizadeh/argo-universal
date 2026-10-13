import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  countDatabaseReads,
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { finishSubscription } from '#mocks/list-observation';
import { watchEngineList } from '#mocks/list-observation';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { SessionRowUpdateJob } from '../sessions';

const writerWriteEvent = 'writer.write';

it('pages current queued activity before the list publication delay', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  insertEndedTurn(database);
  onTestFinished(remove);
  insertSession(database, { id: 'session-2', activityAt: 10 });
  insertEndedTurn(database, 'session-2');
  const {
    databaseWriter: writer,
    createCaller,
    database: engineDatabase,
  } = await startEngineTestHost({
    database,
    ...scriptedEngineInput(),
  });
  engineDatabase.$client.exec(
    "CREATE TEMP TRIGGER pause_activity BEFORE UPDATE ON session BEGIN SELECT RAISE(FAIL, 'test write failure'); END",
  );
  const counted = countDatabaseReads(engineDatabase);
  const { caller, controller } = watchEngineList(createCaller);
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  await updates.next();
  await updates.next();
  vi.useFakeTimers();
  try {
    await vi.advanceTimersByTimeAsync(100);
    counted.metrics.sessionReads = 0;
    writer.send({
      type: writerWriteEvent,
      job: new SessionRowUpdateJob({
        id: 'session-1',
        set: { title: 'Queued newest', maxRevision: 1 },
        activityAt: 20,
      }),
    });
    expect(
      (await caller.session.list({ archived: false })).sessions.map(
        (row): (string | number)[] => [row.sessionId, row.activityAt],
      ),
    ).toEqual([
      ['session-1', 20],
      ['session-2', 10],
    ]);
    expect(
      database.select().from(session).where(eq(session.id, 'session-1')).get()
        ?.activityAt,
    ).toBe(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(counted.metrics.sessionReads).toBe(1);
    counted.metrics.sessionReads = 0;
    engineDatabase.$client.exec('DROP TRIGGER pause_activity');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      database.select().from(session).where(eq(session.id, 'session-1')).get()
        ?.activityAt,
    ).toBe(20);
    expect(counted.metrics.sessionReads).toBe(1);
    expect(
      (await caller.session.list({ archived: false })).sessions[0],
    ).toMatchObject({ sessionId: 'session-1', activityAt: 20 });
    controller.abort();
    await finishSubscription(updates);
  } finally {
    vi.useRealTimers();
  }
});
