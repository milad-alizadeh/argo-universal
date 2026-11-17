import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';

type ConfigRequest = { configId: string; value: unknown };

const predicts = async (
  choice: { type: 'session' } | { type: 'model'; value: string },
): Promise<ConfigRequest[]> => {
  const requests: ConfigRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
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
                content: { type: 'text', text: '{"suggestion":"Ship it"}' },
              },
            },
          ],
        },
      ],
      'session/set_config_option': [
        { requests, result: { configOptions: acpConfiguration } },
      ],
    },
  });

  await host.caller.agent.setSuggestionModel({ id: 'mock', choice });
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Fix the test' }],
    followUpSuggestions: true,
  });
  await waitForAcpSnapshot(
    host,
    sessionId,
    (value) => value.followUpSuggestion?.text === 'Ship it',
  );

  // The main Session never changes its model here, so every change is the background prediction's.
  return requests;
};

it('predicts with the Agent’s chosen suggestion model', async () => {
  expect(await predicts({ type: 'model', value: 'small' })).toEqual([
    expect.objectContaining({ configId: 'model', value: 'small' }),
  ]);
}, 60_000);

it.each([
  { type: 'session' as const },
  { type: 'model' as const, value: 'not-offered' },
])(
  'predicts with the Session’s model otherwise: %o',
  async (choice) => {
    expect(await predicts(choice)).toEqual([
      expect.objectContaining({ configId: 'model', value: 'large' }),
    ]);
  },
  60_000,
);
