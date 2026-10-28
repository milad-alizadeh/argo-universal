import { getConfigOptionDiagnostics } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { operationCaller } from '#mocks/operations';
import { sessionConfiguration } from '#mocks/session-journey';

it.each(['App', 'Operations'])(
  'counts an unknown configuration category once at ACP intake and once in the %s result',
  async (transport) => {
    const host = await startAcpEngine({
      steps: [],
      configOptions: sessionConfiguration,
      responses: {
        'session/set_config_option': [
          {
            result: {
              configOptions: sessionConfiguration.map((option) => ({
                ...option,
                category: 'unexpected_category',
                currentValue: 'large',
              })),
            },
          },
        ],
      },
    });

    const created = await host.caller.session.new(emptySessionInput);
    const caller = await operationCaller(host);

    const params = {
      ...created,
      configId: 'model',
      type: 'id' as const,
      value: 'large',
    };

    const before = getConfigOptionDiagnostics().unknownCategories;

    const applied =
      transport === 'App'
        ? await caller.session.setConfigOption.mutate(params)
        : await caller.operations.run.mutate({
            id: 'session.setConfigOption',
            params,
          });

    expect(applied).toMatchObject({
      configOptions: [
        { category: 'unexpected_category', currentValue: 'large' },
      ],
    });
    expect(getConfigOptionDiagnostics().unknownCategories - before).toBe(2);
  },
);
