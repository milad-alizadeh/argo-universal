import type { PromptRequest } from '@agentclientprotocol/sdk';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { teardownRowId, waitForCancelStep } from '#mocks/feed-inputs';
import { takeFeedChanges } from '#mocks/feed-observations';
import {
  database,
  feedTestHost,
  controller,
  setFeedTestHost,
} from '#mocks/feed-suite';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { scriptedEngineInput } from '#mocks/scripted-engine';

it('persists the final buffered ACP Feed row during real Engine shutdown', async (): Promise<void> => {
  vi.useRealTimers();
  const entered = Promise.withResolvers<PromptRequest>();

  const input = scriptedEngineInput({
    steps: [],
    responses: {
      'session/prompt': [
        { received: entered, steps: [{ type: waitForCancelStep }] },
      ],
    },
  });

  setFeedTestHost(await startEngineTestHost({ database, ...input }));
  await feedTestHost.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start' }],
  });
  await entered.promise;

  const updates = (
    await feedTestHost
      .createCaller({ signal: controller.signal })
      .feed.subscribe({
        sessionId: 'session-1',
        after: { epoch: 3, revision: 5 },
      })
  )[Symbol.asyncIterator]();

  await updates.next();
  await requireScriptedProcessAt(input.agent.processes).play(
    feedScenario([
      {
        sessionUpdate: 'agent_message_chunk',
        messageId: teardownRowId,
        content: { type: 'text', text: 'Before shutdown' },
      },
    ]).steps,
    'owned-1',
  );
  const buffered = await takeFeedChanges(updates, 1);
  expect(buffered).toMatchObject([
    { type: 'row.upsert', row: { messageId: teardownRowId, state: 'open' } },
  ]);
  expect(
    database.$client
      .prepare(
        "SELECT id FROM feed_row WHERE json_extract(payload, '$.messageId') = ?",
      )
      .get(teardownRowId),
  ).toBeUndefined();
  await feedTestHost.stop();
  expect(
    database.$client
      .prepare(
        "SELECT payload FROM feed_row WHERE json_extract(payload, '$.messageId') = ?",
      )
      .get(teardownRowId),
  ).toMatchObject({ payload: expect.stringContaining('Before shutdown') });
});
