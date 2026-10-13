import type { SessionInfo } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { insertSession, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { finishSubscription } from '#mocks/list-observation';
import { nextListChange } from '#mocks/list-observation';
import { watchEngineList } from '#mocks/list-observation';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { TurnInsertJob } from '../sessions';

const writerWriteEvent = 'writer.write';

it('sends live list changes and attention/running counts through request and Turn transitions', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'archived', archivedAt: 1, maxRevision: 1 });
  insertSession(database, {
    id: 'subagent',
    parentSessionId: 'session-1',
    maxRevision: 1,
  });
  const completed = Promise.withResolvers<void>();
  const input = scriptedEngineInput({
    steps: [],
    responses: { 'session/prompt': [{ waitFor: completed.promise }] },
  });
  const { databaseWriter: writer, createCaller } = await startEngineTestHost({
    database,
    ...input,
  });
  const { caller, controller } = watchEngineList(createCaller);
  const counts = (await caller.session.counts())[Symbol.asyncIterator]();
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  expect((await counts.next()).value).toEqual({ attention: 0, running: 0 });
  expect((await updates.next()).value).toMatchObject({
    type: 'changed',
    session: { sessionId: 'session-1', status: 'idle' },
  });
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
  const newest = await nextListChange(
    updates,
    (update): boolean =>
      update.type === 'changed' &&
      update.session.status === 'unread' &&
      update.session.activity === 'All done',
  );
  expect(newest).toMatchObject({ session: { activity: 'All done' } });
  controller.abort();
  await finishSubscription(counts);
  await finishSubscription(updates);
});
