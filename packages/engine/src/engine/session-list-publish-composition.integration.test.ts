import { expect, it, onTestFinished } from 'vitest';
import { insertEndedTurn, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { finishSubscription } from '#mocks/list-observation';
import { nextListChange } from '#mocks/list-observation';
import { watchEngineList } from '#mocks/list-observation';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { SessionRowUpdateJob } from '../sessions';

const writerWriteEvent = 'writer.write';

it('publishes stored list changes, changes counts only when needed, and aborts a waiting subscription', async (): Promise<void> => {
  const { database, remove } = openTestDatabase({
    maxRevision: 1,
    title: 'Unread',
  });
  insertEndedTurn(database);
  onTestFinished(remove);
  const { databaseWriter: writer, createCaller } = await startEngineTestHost({
    database,
    ...scriptedEngineInput(),
  });
  const { caller, controller } = watchEngineList(createCaller);
  const counts = (await caller.session.counts())[Symbol.asyncIterator]();
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  expect((await counts.next()).value).toEqual({ attention: 1, running: 0 });
  await updates.next();
  const waitingCounts = counts.next();
  writer.send({
    type: writerWriteEvent,
    job: new SessionRowUpdateJob({
      id: 'session-1',
      set: { title: 'Renamed' },
    }),
  });
  expect((await updates.next()).value).toMatchObject({
    type: 'changed',
    session: { title: 'Renamed' },
  });
  writer.send({
    type: writerWriteEvent,
    job: new SessionRowUpdateJob({ id: 'session-1', set: { archivedAt: 5 } }),
  });
  expect((await waitingCounts).value).toEqual({ attention: 0, running: 0 });
  await nextListChange(
    updates,
    (update): boolean =>
      update.type === 'changed' && update.session.archivedAt === 5,
  );
  expect((await caller.session.list({ archived: false })).sessions).toEqual([]);
  const waiting = counts.next();
  controller.abort();
  expect(await waiting).toMatchObject({ done: true });
  await finishSubscription(updates);
});
