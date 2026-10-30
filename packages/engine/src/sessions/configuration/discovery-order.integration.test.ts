import type { SetSessionConfigOptionRequest } from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { collectOptions, optionsInput } from './agent-options.test.mocks';

const choosing =
  (id: string, value: string) =>
  (
    option: (typeof acpConfiguration)[number],
  ): (typeof acpConfiguration)[number] =>
    option.id === id && option.type === 'select'
      ? { ...option, currentValue: value }
      : option;

const afterModel = acpConfiguration.map(choosing('model', 'small'));

const afterEffort = afterModel.map(choosing('effort', 'low'));

const afterMode = afterEffort.map(choosing('mode', 'plan'));

it('sends the picks before Send in model, effort, mode order', async () => {
  const requests: SetSessionConfigOptionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: {
      'session/set_config_option': [afterModel, afterEffort, afterMode].map(
        (configOptions) => ({ requests, result: { configOptions } }),
      ),
    },
  });

  await collectOptions(
    host.caller.session.agentOptions({
      ...optionsInput(),
      picks: { mode: 'plan', effort: 'low', model: 'small' },
    }),
  );

  expect(requests.map(({ configId }) => configId)).toEqual([
    'model',
    'effort',
    'mode',
  ]);
});
