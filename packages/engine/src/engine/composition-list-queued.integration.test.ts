import { agentAdapters } from '@repo/agents';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { watchList, useListTimers } from '#mocks/composition-list';
import {
  countDatabaseReads,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { SessionRowUpdateJob } from '../sessions';

const writerWriteEvent = 'writer.write';

it.each(agentAdapters)(
  'pages current queued activity before the list publication delay for $agent',
  async ({ agent }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    onTestFinished(remove);
    insertSession(database, { id: 'session-2', activityAt: 10 });
    const host = await startEngineTestHost({
      database,
      ...scriptedEngineInput(undefined, agent),
    });
    host.database.$client.exec(
      "CREATE TEMP TRIGGER pause_activity BEFORE UPDATE ON session BEGIN SELECT RAISE(FAIL, 'test write failure'); END",
    );
    const counted = countDatabaseReads(host.database);
    const { caller, updates } = await watchList(host);
    await updates.next();
    await updates.next();
    useListTimers();
    await vi.advanceTimersByTimeAsync(100);
    counted.metrics.sessionReads = 0;

    host.databaseWriter.send({
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
    host.database.$client.exec('DROP TRIGGER pause_activity');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(
      database.select().from(session).where(eq(session.id, 'session-1')).get()
        ?.activityAt,
    ).toBe(20);
    expect(counted.metrics.sessionReads).toBe(1);
    expect(
      (await caller.session.list({ archived: false })).sessions[0],
    ).toMatchObject({ sessionId: 'session-1', activityAt: 20 });
  },
);
