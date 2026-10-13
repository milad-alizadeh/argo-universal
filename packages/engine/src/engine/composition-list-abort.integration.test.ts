import { agentAdapters } from '@repo/agents';
import { expect, it, onTestFinished } from 'vitest';
import {
  closeSubscription,
  nextMatching,
  changedSession,
} from '#mocks/composition-subscriptions';
import { insertEndedTurn, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { SessionRowUpdateJob } from '../sessions';

const writerWriteEvent = 'writer.write';

it.each(agentAdapters)(
  'publishes stored list changes, changes counts only when needed, and aborts a waiting subscription for $agent',
  async ({ agent }): Promise<void> => {
    const { database, remove } = openTestDatabase({
      agent,
      maxRevision: 1,
      title: 'Unread',
    });
    insertEndedTurn(database);
    onTestFinished(remove);
    const host = await startEngineTestHost({
      database,
      ...scriptedEngineInput(undefined, agent),
    });
    const { createCaller } = host;
    const controller = new AbortController();
    onTestFinished((): void => controller.abort());
    const caller = createCaller({ signal: controller.signal });
    const counts = (await caller.session.counts())[Symbol.asyncIterator]();
    const updates = (await caller.session.listUpdates())[
      Symbol.asyncIterator
    ]();
    expect((await counts.next()).value).toEqual({ attention: 1, running: 0 });
    await updates.next();
    const writer = host.databaseWriter;
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
    await nextMatching(
      updates,
      (update) => changedSession(update).archivedAt === 5,
    );
    expect((await caller.session.list({ archived: false })).sessions).toEqual(
      [],
    );
    const waiting = counts.next();
    controller.abort();
    expect(await waiting).toMatchObject({ done: true });
    await closeSubscription(updates);
  },
);
