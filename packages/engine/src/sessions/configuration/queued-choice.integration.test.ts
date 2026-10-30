import type { SetSessionConfigOptionRequest } from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const configuredSessionId = 'configured-session';

it.each(fixtureAgents.map(({ agent }) => agent))(
  'a queued choice is rechecked after a model removes its offered option',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
    const finish = Promise.withResolvers<void>();
    const requests: SetSessionConfigOptionRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [
            {
              requests,
              received: started,
              waitFor: finish.promise,
              result: {
                configOptions: acpConfiguration.filter(
                  (option) => option.id !== 'effort',
                ),
              },
            },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    const model = host.caller.session.setConfigOption({
      ...created,
      configId: 'model',
      type: 'id',
      value: 'small',
    });

    await started.promise;

    const effort = host.caller.session.setConfigOption({
      ...created,
      configId: 'effort',
      type: 'id',
      value: 'low',
    });

    const settled = Promise.allSettled([effort]);
    finish.resolve();
    await model;
    expect(await settled).toMatchObject([
      {
        status: 'rejected',
        reason: { message: expect.stringContaining('effort') },
      },
    ]);
    expect(requests.map((request) => request.configId)).toEqual(['model']);
  },
);
