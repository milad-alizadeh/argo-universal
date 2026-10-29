import type { SessionConfigOption } from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const configuredSessionId = 'configured-session';

it.each(fixtureAgents.map(({ agent }) => agent))(
  'the lifetime subscription applies authoritative configuration updates to the actual Session',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    const updated: SessionConfigOption[] = [
      {
        id: 'fast-mode',
        name: 'Fast mode',
        category: 'model_config',
        type: 'select',
        currentValue: 'on',
        options: [
          {
            group: 'speed',
            name: 'Speed',
            options: [
              { value: 'on', name: 'On', description: null, _meta: null },
              { value: 'off', name: 'Off' },
            ],
          },
        ],
        description: null,
        _meta: null,
      },
    ];

    await requireScriptedProcessAt(host.agent.processes).play(
      [
        {
          type: 'update',
          update: {
            sessionUpdate: 'config_option_update',
            configOptions: updated,
          },
        },
      ],
      configuredSessionId,
    );

    const feed = (
      await host.caller.feed.subscribe({ ...created, after: null })
    )[Symbol.asyncIterator]();

    const expected = [
      {
        configId: 'fast-mode',
        name: 'Fast mode',
        category: 'model_config',
        type: 'select',
        currentValue: 'on',
        options: [
          {
            groupId: 'speed',
            name: 'Speed',
            options: [
              { value: 'on', name: 'On' },
              { value: 'off', name: 'Off' },
            ],
          },
        ],
      },
    ];

    await expect
      .poll(async () => (await feed.next()).value)
      .toMatchObject({
        type: 'snapshot',
        snapshot: { configOptions: expected },
      });
    await feed.return?.();
  },
);
