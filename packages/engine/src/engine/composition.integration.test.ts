import { feedRow } from '@repo/db/schema';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it, onTestFinished } from 'vitest';
import { waitFor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

const engineStopEvent = 'engine.stop';

const waitForCancelStep = 'wait-for-cancel';

it.each(fixtureAgents)(
  'serves live $agent Session procedures and drains their Feed before closing the database',
  async ({ agent }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    onTestFinished(remove);

    const input = scriptedEngineInput(
      {
        steps: [
          {
            type: 'update',
            update: {
              sessionUpdate: 'agent_message_chunk',
              messageId: 'reply',
              content: { type: 'text', text: 'Hello from the Agent' },
            },
          },
          { type: waitForCancelStep },
        ],
      },
      agent,
    );

    const {
      engine,
      createCaller,
      database: engineDatabase,
    } = await startEngineTestHost({ database, ...input });

    const caller = createCaller();

    const { messageId } = await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Hi' }],
    });

    expect(
      await caller.feed.row({ sessionId: 'session-1', id: messageId }),
    ).toMatchObject({ sessionUpdate: 'user_message' });
    await expect
      .poll(() =>
        caller.feed.row({
          sessionId: 'session-1',
          id: '["agent_message","owned-1",["upstream","reply"]]',
        }),
      )
      .toMatchObject({
        content: [{ type: 'text', text: 'Hello from the Agent' }],
      });
    engine.send({ type: engineStopEvent, reason: 'SIGTERM' });
    await waitFor(
      engine,
      (snapshot): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
        snapshot.status === 'done',
    );
    expect(engineDatabase.$client.isOpen).toBe(false);
    expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
    expect(
      database
        .select({ id: feedRow.id })
        .from(feedRow)
        .orderBy(feedRow.position)
        .all(),
    ).toEqual([
      { id: messageId },
      { id: '["agent_message","owned-1",["upstream","reply"]]' },
      { id: expect.stringMatching(/:end$/) },
    ]);
  },
);
