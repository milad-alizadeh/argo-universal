import { agentAdapters } from '@repo/agents';
import { expect, it, onTestFinished, vi } from 'vitest';
import { watchList, useListTimers } from '#mocks/composition-list';
import {
  countDatabaseReads,
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { SessionRowUpdateJob } from '../sessions';

const writerWriteEvent = 'writer.write';
const changedAloneTitle = 'Changed alone';

it.each(agentAdapters)(
  'reads only the changed Session and pages the shared cache for $agent',
  async ({ agent }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    insertEndedTurn(database);
    onTestFinished(remove);
    for (let index = 2; index <= 60; index++) {
      insertSession(database, { id: `session-${index}` });
      insertEndedTurn(database, `session-${index}`);
    }
    const host = await startEngineTestHost({
      database,
      ...scriptedEngineInput(undefined, agent),
    });
    const counted = countDatabaseReads(host.database);
    const { caller, updates } = await watchList(host);
    expect(
      await Promise.all(Array.from({ length: 60 }, () => updates.next())),
    ).toMatchObject(
      Array.from({ length: 60 }, () => ({ value: { type: 'changed' } })),
    );
    useListTimers();
    await vi.advanceTimersByTimeAsync(100);
    counted.metrics.queries = 0;
    counted.metrics.rows = 0;
    const changed = updates.next();

    host.databaseWriter.send({
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
    expect(page.nextCursor).not.toBeNull();
    const next = await caller.session.list({
      archived: false,
      cursor: page.nextCursor ?? undefined,
    });
    expect(next.sessions).toHaveLength(10);
    expect(next.nextCursor).toBeNull();
    expect(counted.metrics.queries).toBe(0);
  },
);
