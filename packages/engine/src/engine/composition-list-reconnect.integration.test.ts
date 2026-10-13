import { agentAdapters } from '@repo/agents';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import type { ActorRefFrom } from 'xstate';
import { closeSubscription } from '#mocks/composition-subscriptions';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { SessionRowUpdateJob } from '../sessions';
import { writerMachine } from '../storage';

const writerWriteEvent = 'writer.write';
const unwatchedTitle = 'Changed without watchers';

it.each(agentAdapters)(
  'initializes a fresh list after all watchers leave and unwatched data changes for $agent',
  async ({ agent }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    onTestFinished(remove);
    const { engine, createCaller } = await startEngineTestHost({
      database,
      ...scriptedEngineInput(undefined, agent),
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
    await closeSubscription(updates);
    const writer: ActorRefFrom<typeof writerMachine> =
      engine.system.get('databaseWriter');
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
          database
            .select()
            .from(session)
            .where(eq(session.id, 'session-1'))
            .get()?.title,
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
  },
);
