import { agentAdapters } from '@repo/agents';
import type { SessionUpdate } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import {
  startHeaderHost,
  expectHeaderActivity,
  sendHeaderRow,
} from '#mocks/composition-live-header';
import { closeSubscription } from '#mocks/composition-subscriptions';
import { liveHeaderMocks } from '#mocks/live-header';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const checkingTestsStatus = 'Checking the tests';
const retryingStatus = 'Retrying (2 of 5)';
const allowTestsTitle = 'Allow tests?';

it.each(
  agentAdapters.flatMap(({ agent }) =>
    liveHeaderMocks.map((mock) => ({
      ...mock,
      recordingAgent: mock.agent,
      agent,
    })),
  ),
)(
  'reads stored live-header rules through list and Feed snapshots for $agent with $recordingAgent recording',
  async ({ agent, command, thought, retry, progress }): Promise<void> => {
    const host = await startHeaderHost(agent);
    const { caller, completed, input, controller, subscription } = host;
    const expectActivity = (text: string): Promise<void> =>
      expectHeaderActivity(host, text);
    const sendRow = (row: SessionUpdate): Promise<void> =>
      sendHeaderRow(host, row);
    await expectActivity('Working');
    await sendRow({
      ...command,
      title: '',
      kind: 'execute',
      content: [{ type: 'terminal', command: 'pnpm test', output: '' }],
      _meta: undefined,
    });
    await expectActivity('Running pnpm test');
    await sendRow(thought);
    await expectActivity(checkingTestsStatus);
    await sendRow(retry);
    await expectActivity(retryingStatus);
    // Settled rows have left the Feed actor by now; a fresh subscription must retain the retry.
    const reconnect = (
      await caller.feed.subscribe({ sessionId: 'session-1', after: null })
    )[Symbol.asyncIterator]();
    expect((await reconnect.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        liveHeader: {
          text: retryingStatus,
          source: { type: 'retry' },
          startedAt: expect.any(Number),
        },
      },
    });
    for (const row of progress) {
      await sendRow(retry);
      await expectActivity(retryingStatus);
      await sendRow(row);
      await expect
        .poll(async (): Promise<boolean> =>
          (
            await caller.feed.page({
              sessionId: 'session-1',
              direction: 'tail',
            })
          ).rows.some((stored): boolean => stored.id === row.id),
        )
        .toBe(true);
      await expectActivity(checkingTestsStatus);
    }
    await sendRow({ ...command, status: 'completed', state: 'settled' });
    await expectActivity(checkingTestsStatus);
    await requireScriptedProcessAt(input.agent.processes).play(
      [
        {
          type: 'permission',
          detached: true,
          request: {
            toolCall: {
              toolCallId: command.toolCallId,
              title: allowTestsTitle,
            },
            options: permissionOptions,
          },
        },
      ],
      'owned-1',
    );
    await expect
      .poll(
        async () =>
          (await caller.session.list({ archived: false })).sessions[0]
            ?.activity,
      )
      .toBe(allowTestsTitle);
    completed.resolve();
    await waitForAcpSessionIdle(host, 'session-1');
    await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Next Turn' }],
    });
    await expectActivity('Working');
    controller.abort();
    await closeSubscription(subscription);
    await closeSubscription(reconnect);
  },
);
