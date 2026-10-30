import type {
  PromptRequest,
  SessionConfigOption,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

// The small model offers only low effort, so a held high effort is no longer offered once the model changes.
const smallModelOptions: SessionConfigOption[] = [
  {
    id: 'model',
    name: 'Model',
    category: 'model',
    type: 'select',
    currentValue: 'small',
    options: [
      { value: 'large', name: 'Large' },
      { value: 'small', name: 'Small' },
    ],
  },
  {
    id: 'effort',
    name: 'Effort',
    category: 'thought_level',
    type: 'select',
    currentValue: 'low',
    options: [{ value: 'low', name: 'Low' }],
  },
];

it('refuses the next prompt as a bad request when a held choice is no longer offered', async () => {
  const finish = Promise.withResolvers<void>();
  const prompted = Promise.withResolvers<PromptRequest>();

  const host = await startAcpEngine({
    configOptions: acpConfiguration,
    steps: [],
    responses: {
      'session/prompt': [{ received: prompted, waitFor: finish.promise }],
      'session/set_config_option': [
        { result: { configOptions: smallModelOptions } },
      ],
    },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await prompted.promise;

  for (const [configId, value] of [
    ['model', 'small'],
    ['effort', 'high'],
  ] as const)
    await host.caller.session.setConfigOption({
      ...created,
      configId,
      type: 'id',
      value,
    });

  finish.resolve();
  await waitForAcpSessionIdle(host, created.sessionId);
  await expect(
    host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Next' }],
    }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: 'The Agent did not offer effort=high',
  });
});
