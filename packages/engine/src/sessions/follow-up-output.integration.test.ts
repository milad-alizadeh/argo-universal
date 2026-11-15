import { setImmediate } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

it.each([
  'not JSON',
  '{"suggestion":"   "}',
  '{"suggestion":42}',
  JSON.stringify({ suggestion: 'x'.repeat(1001) }),
  '{"suggestion":null}',
])('discards unusable prediction output: %s', async (text) => {
  const closed = Promise.withResolvers<{ sessionId: string }>();

  const host = await startAcpEngine({
    steps: [],
    initialize: {
      protocolVersion: 1,
      agentCapabilities: { sessionCapabilities: { close: {} } },
    },
    responses: {
      'session/prompt': [
        { steps: [] },
        {
          prompt: 'Return JSON only:',
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text },
              },
            },
          ],
        },
      ],
      'session/close': [{ received: closed }],
    },
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Fix the test' }],
    followUpSuggestions: true,
  });
  await closed.promise;
  await setImmediate();
  await waitForAcpSessionIdle(host, sessionId);
  expect(
    (await host.caller.session.get({ sessionId })).followUpSuggestion?.text,
  ).toBeNull();
});

it.each(['disabled', 'failed', 'cancelled'] as const)(
  'does not generate after a %s Turn',
  async (outcome) => {
    const requests: { sessionId: string }[] = [];

    const host = await startAcpEngine({
      steps: [],
      responses: {
        'session/prompt': [
          {
            requests,
            result: {
              stopReason: outcome === 'cancelled' ? 'cancelled' : 'end_turn',
            },
            error: outcome === 'failed' ? 'Agent failed' : undefined,
          },
        ],
      },
    });

    const { sessionId } = await host.caller.session.new(emptySessionInput);
    await host.caller.session.prompt({
      sessionId,
      prompt: [{ type: 'text', text: 'Fix the test' }],
      followUpSuggestions: outcome !== 'disabled',
    });
    await waitForAcpSessionIdle(host, sessionId);
    expect(
      (await host.caller.session.get({ sessionId })).followUpSuggestion,
    ).toBeNull();
    expect(requests).toHaveLength(1);
  },
);
