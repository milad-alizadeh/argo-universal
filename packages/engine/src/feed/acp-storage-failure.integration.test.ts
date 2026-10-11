import type {
  CancelNotification,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

// More settled tool rows than the Writer keeps queued for the Feed.
const toolCount = 300;
const holdToolRows =
  "CREATE TRIGGER hold_tool_rows BEFORE INSERT ON feed_row WHEN NEW.session_update = 'tool_call_update' BEGIN SELECT RAISE(FAIL, 'storage failure'); END";

it('a Turn that outgrows the Writer while storage fails is cancelled, and prompts wait for a commit', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const cancels: CancelNotification[] = [];
  const cancelled = Promise.withResolvers<CancelNotification>();
  const prompts: PromptRequest[] = [];
  const host = await startAcpEngine({
    steps: [],
    notifications: {
      'session/cancel': { received: cancelled, requests: cancels },
    },
    responses: {
      'session/prompt': [
        {
          requests: prompts,
          steps: [
            ...Array.from({ length: toolCount }, (_, index) => ({
              type: 'update' as const,
              update: {
                sessionUpdate: 'tool_call' as const,
                toolCallId: `tool-${index}`,
                title: `Read ${index}`,
                status: 'completed' as const,
              },
            })),
            { type: 'wait-for-cancel' },
          ],
        },
        { requests: prompts },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const prompt = (text: string): Promise<unknown> =>
    host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text }],
    });
  host.database.$client.exec(holdToolRows);
  try {
    await prompt('Read everything');
    await cancelled.promise;
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(cancels).toHaveLength(1);
    await expect(prompt('Again')).rejects.toThrow(/could not be saved/);
    expect(prompts).toHaveLength(1);
  } finally {
    host.database.$client.exec('DROP TRIGGER IF EXISTS hold_tool_rows');
  }
  await expect
    .poll(
      () =>
        host.database.$client
          .prepare(
            "SELECT stop_reason AS stopReason, error FROM turn WHERE session_id = ? AND status = 'ended'",
          )
          .get(created.sessionId),
      { timeout: 10_000 },
    )
    .toEqual({
      stopReason: 'error',
      error: expect.stringContaining('Storage is failing'),
    });
  await prompt('Once storage recovers');
  await waitForAcpSessionIdle(host, created.sessionId);
  expect(prompts).toHaveLength(2);
}, 30_000);
