import type { SessionConfigOption } from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const configuredSessionId = 'configured-session';

it.each(fixtureAgents.map(({ agent }) => agent))(
  'the full returned configuration replaces guessed model-dependent choices',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };

    const returned: SessionConfigOption[] = [
      {
        id: 'model',
        name: 'Model',
        category: 'model',
        type: 'select',
        currentValue: 'small',
        options: [{ value: 'small', name: 'Small' }],
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

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [
            { result: { configOptions: returned } },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    const applied = await host.caller.session.setConfigOption({
      ...created,
      configId: 'model',
      type: 'id',
      value: 'small',
    });

    expect(applied.configOptions).toEqual([
      {
        configId: 'model',
        name: 'Model',
        category: 'model',
        type: 'select',
        currentValue: 'small',
        options: [{ value: 'small', name: 'Small' }],
      },
      {
        configId: 'effort',
        name: 'Effort',
        category: 'thought_level',
        type: 'select',
        currentValue: 'low',
        options: [{ value: 'low', name: 'Low' }],
      },
    ]);
  },
);
