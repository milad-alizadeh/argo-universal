import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { finishSubscription } from '#mocks/list-observation';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { SessionRowUpdateJob } from '../sessions';

const writerWriteEvent = 'writer.write';
const unwatchedTitle = 'Changed without watchers';

it('initializes a fresh list after all watchers leave and unwatched data changes', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const { databaseWriter: writer, createCaller } = await startEngineTestHost({
    database,
    ...scriptedEngineInput(),
  });
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const watchedCaller = createCaller({ signal: controller.signal });
  const caller = createCaller();
  const updates = (await watchedCaller.session.listUpdates())[
    Symbol.asyncIterator
  ]();
  expect((await updates.next()).value).toMatchObject({
    type: 'changed',
    session: { title: '' },
  });
  controller.abort();
  await finishSubscription(updates);
  writer.send({
    type: writerWriteEvent,
    job: new SessionRowUpdateJob({
      id: 'session-1',
      set: { title: unwatchedTitle, maxRevision: 1 },
    }),
  });
  await expect
    .poll(
      () =>
        database.select().from(session).where(eq(session.id, 'session-1')).get()
          ?.title,
    )
    .toBe(unwatchedTitle);
  expect(
    (await caller.session.list({ archived: false })).sessions,
  ).toMatchObject([
    {
      sessionId: 'session-1',
      title: unwatchedTitle,
      status: 'unread',
    },
  ]);
});
