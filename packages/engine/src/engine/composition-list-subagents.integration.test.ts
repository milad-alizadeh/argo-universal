import { agentAdapters } from '@repo/agents';
import { expect, it, onTestFinished, vi } from 'vitest';
import type { ActorRefFrom } from 'xstate';
import { closeSubscription } from '#mocks/composition-subscriptions';
import { insertSession, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { TurnInsertJob, TurnUpdateJob } from '../sessions';
import { writerMachine } from '../storage';

const writerWriteEvent = 'writer.write';

it.each(agentAdapters)(
  'updates a cached parent when its stored Subagent Turn changes for $agent',
  async ({ agent }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    onTestFinished(remove);
    insertSession(database, { id: 'child-1', parentSessionId: 'session-1' });
    const { engine, createCaller } = await startEngineTestHost({
      database,
      ...scriptedEngineInput(undefined, agent),
    });
    const controller = new AbortController();
    onTestFinished((): void => controller.abort());
    const caller = createCaller({ signal: controller.signal });
    const updates = (await caller.session.listUpdates())[
      Symbol.asyncIterator
    ]();
    expect((await updates.next()).value).toMatchObject({
      session: { subagents: { total: 1, running: 0 } },
    });
    vi.useFakeTimers();
    try {
      await vi.advanceTimersByTimeAsync(100);
      const writer: ActorRefFrom<typeof writerMachine> =
        engine.system.get('databaseWriter');
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
        session: {
          sessionId: 'session-1',
          subagents: { total: 1, running: 1 },
        },
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
        session: {
          sessionId: 'session-1',
          subagents: { total: 1, running: 0 },
        },
      });
      controller.abort();
      await closeSubscription(updates);
    } finally {
      vi.useRealTimers();
    }
  },
);
