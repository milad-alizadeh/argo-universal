import type { SetSessionConfigOptionRequest } from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const configuredSessionId = 'configured-session';

it.each(fixtureAgents.map(({ agent }) => agent))(
  'initial settings finish before prompted creation dispatches any Agent work',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const commands: { sessionId: string }[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [{ requests: commands }],
          'session/prompt': [{ requests: commands }],
        },
      },
      undefined,
      agentId,
    );

    await host.caller.session.new({
      ...sessionInput,
      configOptions: [{ configId: 'mode', value: 'plan' }],
      prompt: [{ type: 'text', text: 'Plan first' }],
    });
    await expect
      .poll(() => commands)
      .toMatchObject([
        { configId: 'mode' },
        { prompt: [{ text: 'Plan first' }] },
      ]);
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'explicit closure rejects a pending configuration instead of reporting false success',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
    const completion = Promise.withResolvers<void>();

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [
            { received: started, waitFor: completion.promise },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    const setting = host.caller.session.setConfigOption({
      ...created,
      configId: 'mode',
      type: 'id',
      value: 'plan',
    });

    const settled = Promise.allSettled([setting]);
    await started.promise;
    await host.caller.session.close(created);
    completion.resolve();
    expect(await settled).toMatchObject([
      {
        status: 'rejected',
        reason: { message: 'Session closed before configuration completed' },
      },
    ]);
  },
);

it('refuses a first choice the Agent did not offer as a bad request', async () => {
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
  });

  await expect(
    host.caller.session.new({
      ...emptySessionInput,
      configOptions: [{ configId: 'mode', value: 'review' }],
    }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: 'The Agent did not offer mode=review',
  });
});
