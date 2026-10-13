import { expect, it, onTestFinished, vi } from 'vitest';
import {
  countDatabaseReads,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { finishSubscription } from '#mocks/list-observation';
import { watchEngineList } from '#mocks/list-observation';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { SessionRowUpdateJob } from '../sessions';

const writerWriteEvent = 'writer.write';
const changedAloneTitle = 'Changed alone';

it('reads only the changed Session and pages the shared cache', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  Array.from({ length: 59 }, (_, index): void => {
    insertSession(database, { id: `session-${index + 2}` });
  });
  const {
    databaseWriter: writer,
    createCaller,
    database: engineDatabase,
  } = await startEngineTestHost({
    database,
    ...scriptedEngineInput(),
  });
  const counted = countDatabaseReads(engineDatabase);
  const { caller } = watchEngineList(createCaller);
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  for (let index = 0; index < 60; index++)
    expect((await updates.next()).value).toMatchObject({ type: 'changed' });
  vi.useFakeTimers();
  try {
    await vi.advanceTimersByTimeAsync(100);
    counted.metrics.queries = 0;
    counted.metrics.rows = 0;
    const changed = updates.next();
    writer.send({
      type: writerWriteEvent,
      job: new SessionRowUpdateJob({
        id: 'session-1',
        set: { title: changedAloneTitle, maxRevision: 1 },
      }),
    });
    await vi.advanceTimersByTimeAsync(100);
    expect((await changed).value).toMatchObject({
      type: 'changed',
      session: { sessionId: 'session-1', title: changedAloneTitle },
    });
    expect(counted.metrics.queries).toBeLessThanOrEqual(5);
    expect(counted.metrics.rows).toBeLessThanOrEqual(3);
    counted.metrics.queries = 0;
    const page = await caller.session.list({ archived: false });
    expect(page.sessions[0]).toMatchObject({
      sessionId: 'session-1',
      title: changedAloneTitle,
      status: 'unread',
    });
    expect(page.sessions).toHaveLength(50);
    if (page.nextCursor === null) throw new Error('Expected next list page');
    const next = await caller.session.list({
      archived: false,
      cursor: page.nextCursor,
    });
    expect(next.sessions).toHaveLength(10);
    expect(next.nextCursor).toBeNull();
    expect(counted.metrics.queries).toBe(0);
    await finishSubscription(updates);
  } finally {
    vi.useRealTimers();
  }
});
