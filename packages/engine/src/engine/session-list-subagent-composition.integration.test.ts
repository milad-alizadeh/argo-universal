import { expect, it, onTestFinished, vi } from 'vitest';
import { insertSession, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { finishSubscription } from '#mocks/list-observation';
import { watchEngineList } from '#mocks/list-observation';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { TurnInsertJob, TurnUpdateJob } from '../sessions';

const writerWriteEvent = 'writer.write';

it('updates a cached parent when its stored Subagent Turn changes', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
  const { databaseWriter: writer, createCaller } = await startEngineTestHost({
    database,
    ...scriptedEngineInput(),
  });
  const { caller, controller } = watchEngineList(createCaller);
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  expect((await updates.next()).value).toMatchObject({
    session: { subagents: { total: 1, running: 0 } },
  });
  vi.useFakeTimers();
  try {
    await vi.advanceTimersByTimeAsync(100);
    const running = updates.next();
    writer.send({
      type: writerWriteEvent,
      job: new TurnInsertJob({
        turn: {
          id: 'child-turn',
          sessionId: 'child-1',
          status: 'running',
          startedAt: 1,
        },
      }),
    });
    await vi.advanceTimersByTimeAsync(100);
    expect((await running).value).toMatchObject({
      session: { sessionId: 'session-1', subagents: { total: 1, running: 1 } },
    });
    const stopped = updates.next();
    writer.send({
      type: writerWriteEvent,
      job: new TurnUpdateJob({
        id: 'child-turn',
        set: { status: 'ended', endedAt: 2 },
      }),
    });
    await vi.advanceTimersByTimeAsync(100);
    expect((await stopped).value).toMatchObject({
      session: { sessionId: 'session-1', subagents: { total: 1, running: 0 } },
    });
    controller.abort();
    await finishSubscription(updates);
  } finally {
    vi.useRealTimers();
  }
});
