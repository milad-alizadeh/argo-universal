import type {
  DeleteSessionRequest,
  NewSessionRequest,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot, waitForAcpSessionIdle } from '#mocks/acp-feed';

const nextPrompt = 'Run the smoke suite';

it('discards the background prediction session when the Agent supports it', async () => {
  const opened: NewSessionRequest[] = [];
  const discarded: DeleteSessionRequest[] = [];
  const prediction = Promise.withResolvers<PromptRequest>();

  const host = await startAcpEngine({
    steps: [],
    initialize: {
      protocolVersion: 1,
      agentCapabilities: { sessionCapabilities: { delete: {} } },
    },
    responses: {
      'session/new': [{ requests: opened }, { requests: opened }],
      'session/delete': [{ requests: discarded, result: {} }],
      'session/prompt': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'The failing test is fixed.' },
              },
            },
          ],
        },
        {
          prompt: 'Return JSON only:',
          received: prediction,
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: {
                  type: 'text',
                  text: JSON.stringify({ suggestion: nextPrompt }),
                },
              },
            },
          ],
        },
      ],
    },
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Fix the failing test' }],
    followUpSuggestions: true,
  });
  await waitForAcpSessionIdle(host, sessionId);
  await waitForAcpSnapshot(
    host,
    sessionId,
    (value) => value.followUpSuggestion?.text === nextPrompt,
  );

  const [main, background] = opened;
  expect(main?._meta).toBeUndefined();
  expect(background?._meta).toEqual({
    claudeCode: { options: { persistSession: false } },
  });
  const backgroundId = (await prediction.promise).sessionId;

  await expect.poll(() => discarded).toEqual([{ sessionId: backgroundId }]);
});
