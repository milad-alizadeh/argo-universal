import type {
  PromptRequest,
  SetSessionConfigOptionRequest,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it.each(fixtureAgents.map(({ agent }) => agent))(
  'a subsequent prompt waits for authoritative configuration while another Session can prompt',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
    const finish = Promise.withResolvers<void>();
    const prompts: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        responses: {
          'session/set_config_option': [
            {
              received: started,
              waitFor: finish.promise,
              result: { configOptions: acpConfiguration },
            },
          ],
          'session/prompt': [{ requests: prompts }],
        },
      },
      undefined,
      agentId,
    );

    const first = await host.caller.session.new(sessionInput);
    const sibling = await host.caller.session.new(sessionInput);

    const applied = host.caller.session.setConfigOption({
      ...first,
      configId: 'model',
      type: 'id',
      value: 'small',
    });

    await started.promise;

    const prompt = host.caller.session.prompt({
      ...first,
      prompt: [{ type: 'text', text: 'first' }],
    });

    await host.caller.session.prompt({
      ...sibling,
      prompt: [{ type: 'text', text: 'sibling' }],
    });
    await expect
      .poll(() => prompts.map((request) => request.prompt))
      .toEqual([[{ type: 'text', text: 'sibling' }]]);
    finish.resolve();
    await applied;
    await prompt;
    await expect
      .poll(() => prompts.map((request) => request.prompt))
      .toEqual([
        [{ type: 'text', text: 'sibling' }],
        [{ type: 'text', text: 'first' }],
      ]);
  },
);
