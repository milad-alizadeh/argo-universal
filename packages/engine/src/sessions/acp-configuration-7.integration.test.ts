import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it.each(
  fixtureAgents.flatMap(({ agent }) => [
    { agent, configId: 'model', value: 'small' },
    { agent, configId: 'effort', value: 'low' },
    { agent, configId: 'mode', value: 'plan' },
  ]),
)(
  '$agent applies the offered $configId choice without changing a sibling Session',
  async ({ agent, configId, value }) => {
    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        responses: {
          'session/set_config_option': [
            {
              result: {
                configOptions: acpConfiguration.map((option) =>
                  option.type === 'select' && option.id === configId
                    ? { ...option, currentValue: value }
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

    const first = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    const sibling = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    const applied = await host.caller.session.setConfigOption({
      ...first,
      configId,
      type: 'id',
      value,
    });

    expect(
      applied.configOptions.find((option) => option.configId === configId)
        ?.currentValue,
    ).toBe(value);

    const feed = (
      await host.caller.feed.subscribe({ ...sibling, after: null })
    )[Symbol.asyncIterator]();

    expect((await feed.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        configOptions: [
          { configId: 'model', currentValue: 'large' },
          { configId: 'effort', currentValue: 'high' },
          { configId: 'mode', currentValue: 'code' },
          { configId: 'fast', currentValue: false },
        ],
      },
    });
    await feed.return?.();
  },
);
