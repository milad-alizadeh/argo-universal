import type { SetSessionConfigOptionRequest } from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const configuredSessionId = 'configured-session';

it.each(fixtureAgents.map(({ agent }) => agent))(
  '%s applies Fast mode to the actual Session and reports its authoritative response',
  async (agent) => {
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
              result: {
                configOptions: acpConfiguration.map((option) =>
                  option.id === 'fast' && option.type === 'boolean'
                    ? { ...option, currentValue: true }
                    : option,
                ),
              },
            },
          ],
        },
      },
      undefined,
      agent,
    );

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    const applied = await host.caller.session.setConfigOption({
      ...created,
      configId: 'fast',
      type: 'boolean',
      value: true,
    });

    expect(requests).toEqual([
      {
        sessionId: configuredSessionId,
        configId: 'fast',
        type: 'boolean',
        value: true,
      },
    ]);
    expect(applied.configOptions).toContainEqual({
      configId: 'fast',
      name: 'Fast mode',
      category: 'model_config',
      type: 'boolean',
      currentValue: true,
    });
  },
);
