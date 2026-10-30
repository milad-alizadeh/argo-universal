import type {
  PromptRequest,
  SetSessionConfigOptionRequest,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

const unavailableModel = 'Model unavailable';

it.each(appFixtureAgentIds)(
  '%s rejects the next prompt when the Agent refuses a held choice before any new Turn is stored',
  async (agent) => {
    const finish = Promise.withResolvers<void>();
    const prompted = Promise.withResolvers<PromptRequest>();
    const prompts: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        configOptions: acpConfiguration,
        steps: [],
        responses: {
          'session/prompt': [
            { received: prompted, requests: prompts, waitFor: finish.promise },
          ],
          'session/set_config_option': [
            { error: { code: -32602, message: unavailableModel } },
          ],
        },
      },
      undefined,
      agent,
    );

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
      prompt: [{ type: 'text', text: 'First' }],
    });

    await prompted.promise;
    await host.caller.session.setConfigOption({
      ...created,
      configId: 'model',
      type: 'id',
      value: 'small',
    });
    finish.resolve();
    await waitForAcpSessionIdle(host, created.sessionId);
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Next' }],
      }),
    ).rejects.toThrow(unavailableModel);
    expect(prompts).toHaveLength(1);
    expect(
      host.database.$client
        .prepare('SELECT status FROM turn WHERE session_id = ?')
        .all(created.sessionId),
    ).toEqual([{ status: 'ended' }]);
  },
);

it('ignores a cached default removed by the selected model before the first prompt', async () => {
  const requests: SetSessionConfigOptionRequest[] = [];

  const changed = acpConfiguration
    .filter((option) => option.id !== 'fast')
    .map((option) =>
      option.id === 'model' && option.type === 'select'
        ? { ...option, currentValue: 'small' }
        : option,
    );

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: {
      'session/set_config_option': [
        { requests, result: { configOptions: changed } },
      ],
    },
  });

  await expect(
    host.caller.session.new({
      ...emptySessionInput,
      configOptions: [
        { configId: 'model', value: 'small' },
        { configId: 'fast', value: false, optional: true },
      ],
    }),
  ).resolves.toHaveProperty('sessionId');
  expect(requests.map(({ configId }) => configId)).toEqual(['model']);
});
