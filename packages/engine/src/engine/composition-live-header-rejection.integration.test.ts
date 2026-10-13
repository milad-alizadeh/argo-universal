import { agentAdapters } from '@repo/agents';
import { feedRow } from '@repo/db/schema';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it, onTestFinished, vi } from 'vitest';
import { insertEndedTurn, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { scriptedEngineInput } from '#mocks/scripted-engine';

const waitForCancelStep = 'wait-for-cancel';

it.each(agentAdapters)(
  'keeps the Feed subscription open after malformed stored activity for $agent',
  async ({ agent }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    insertEndedTurn(database);
    onTestFinished(remove);
    const input = scriptedEngineInput(
      { steps: [{ type: waitForCancelStep }] },
      agent,
    );
    const host = await startEngineTestHost({ database, ...input });
    const { createCaller } = host;
    const controller = new AbortController();
    onTestFinished((): void => controller.abort());
    const caller = createCaller({ signal: controller.signal });
    await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Check tests' }],
    });
    const subscription = (
      await caller.feed.subscribe({ sessionId: 'session-1', after: null })
    )[Symbol.asyncIterator]();
    const initial = (await subscription.next()).value;
    if (initial?.type !== 'snapshot')
      throw new Error('Expected initial snapshot');
    database
      .insert(feedRow)
      .values({
        sessionId: 'session-1',
        id: 'malformed',
        position: 500,
        revision: 500,
        turnId: initial.snapshot.activeTurnId,
        state: 'settled',
        sessionUpdate: 'agent_thought',
        payloadVersion: 1,
        payload: { messageId: 'malformed', content: 'invalid' },
      })
      .run();
    // A reconnect catches up only to the Session's stored revision.
    database.$client
      .prepare('UPDATE session SET max_revision = 500 WHERE id = ?')
      .run('session-1');
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    onTestFinished((): void => reported.mockRestore());
    const next = subscription.next();
    await requireScriptedProcessAt(input.agent.processes).play(
      [
        {
          type: 'update',
          update: {
            sessionUpdate: 'config_option_update',
            configOptions: acpConfiguration,
          },
        },
      ],
      'owned-1',
    );
    await expect(next).resolves.toMatchObject({
      done: false,
      value: {
        type: 'snapshot',
        snapshot: {
          configOptions: expect.arrayContaining([
            expect.objectContaining({
              configId: 'model',
              currentValue: 'large',
            }),
          ]),
          liveHeader: { text: 'Working', source: { type: 'working' } },
        },
      },
    });
    expect(reported).toHaveBeenCalledWith(
      'sessions: rejected live-header shape #1',
      expect.anything(),
    );
    const following = subscription.next();
    await requireScriptedProcessAt(input.agent.processes).play(
      [
        {
          type: 'update',
          update: {
            sessionUpdate: 'config_option_update',
            configOptions: acpConfiguration.map((option) =>
              option.type === 'select' && option.id === 'model'
                ? { ...option, currentValue: 'small' }
                : option,
            ),
          },
        },
      ],
      'owned-1',
    );
    await expect(following).resolves.toMatchObject({
      done: false,
      value: {
        type: 'snapshot',
        snapshot: {
          configOptions: expect.arrayContaining([
            expect.objectContaining({
              configId: 'model',
              currentValue: 'small',
            }),
          ]),
        },
      },
    });
    await expect(
      caller.feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 50,
      }),
    ).rejects.toThrow(/Invalid input/);
    const catchUp = (
      await caller.feed.subscribe({
        sessionId: 'session-1',
        after: { epoch: initial.snapshot.epoch, revision: 0 },
      })
    )[Symbol.asyncIterator]();
    await expect(catchUp.next()).rejects.toThrow(/Invalid input/);
  },
);
