import { agentAdapters } from '@repo/agents';
import type { SessionInfo } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { watchList } from '#mocks/composition-list';
import {
  closeSubscription,
  nextMatching,
  changedSession,
} from '#mocks/composition-subscriptions';
import {
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { TurnInsertJob } from '../sessions';

const writerWriteEvent = 'writer.write';

it.each(agentAdapters)(
  'sends live list changes and attention/running counts through request and Turn transitions for $agent',
  async ({ agent }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    insertEndedTurn(database);
    onTestFinished(remove);
    for (const values of [
      { id: 'archived', archivedAt: 1, maxRevision: 1 },
      { id: 'subagent', parentSessionId: 'session-1', maxRevision: 1 },
    ]) {
      insertSession(database, values);
      insertEndedTurn(database, values.id);
    }
    const completed = Promise.withResolvers<void>();
    const input = scriptedEngineInput(
      {
        steps: [],
        responses: { 'session/prompt': [{ waitFor: completed.promise }] },
      },
      agent,
    );
    const host = await startEngineTestHost({
      database,
      ...input,
    });
    const { controller, caller, updates } = await watchList(host);
    const counts = (await caller.session.counts())[Symbol.asyncIterator]();
    expect((await counts.next()).value).toEqual({ attention: 0, running: 0 });
    expect((await updates.next()).value).toMatchObject({
      type: 'changed',
      session: { sessionId: 'session-1', status: 'idle' },
    });
    const writer = host.databaseWriter;
    for (const sessionId of ['archived', 'subagent'])
      writer.send({
        type: writerWriteEvent,
        job: new TurnInsertJob({
          turn: { id: `turn-${sessionId}`, sessionId, status: 'running' },
        }),
      });
    await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Hello' }],
    });
    expect((await counts.next()).value).toEqual({ attention: 0, running: 1 });
    await requireScriptedProcessAt(input.agent.processes).play(
      [
        {
          type: 'permission',
          detached: true,
          request: {
            toolCall: { toolCallId: 'permission', title: 'Run a command' },
            options: permissionOptions,
          },
        },
      ],
      'owned-1',
    );
    expect((await counts.next()).value).toEqual({ attention: 1, running: 1 });
    const pending = await caller.session.list({ archived: false });
    expect(pending.sessions[0]).toMatchObject({
      status: 'needs_input',
      activity: 'Run a command',
    });
    await requireScriptedProcessAt(input.agent.processes).play(
      [
        {
          type: 'update',
          update: {
            sessionUpdate: 'agent_message_chunk',
            messageId: 'answer',
            content: { type: 'text', text: 'All done\nDetails' },
          },
        },
      ],
      'owned-1',
    );
    completed.resolve();
    expect((await counts.next()).value).toEqual({ attention: 1, running: 0 });
    await expect
      .poll(
        async (): Promise<SessionInfo | undefined> =>
          (await caller.session.list({ archived: false })).sessions[0],
      )
      .toMatchObject({
        status: 'unread',
        activity: 'All done',
        activityAt: expect.any(Number),
      });
    const newest = await nextMatching(
      updates,
      (update) =>
        changedSession(update).status === 'unread' &&
        changedSession(update).activity === 'All done',
    );
    expect(newest).toMatchObject({
      type: 'changed',
      session: { activity: 'All done' },
    });
    controller.abort();
    await closeSubscription(counts);
    await closeSubscription(updates);
  },
);
