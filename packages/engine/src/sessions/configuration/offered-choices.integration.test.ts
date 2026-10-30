import type { SessionConfigOption } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const offered: SessionConfigOption[] = [
  {
    id: 'mode',
    name: 'Mode',
    type: 'select',
    currentValue: 'ask',
    options: [
      { value: 'ask', name: 'Ask' },
      { value: 'code', name: 'Code' },
    ],
  },
  {
    id: 'model',
    name: 'Model',
    category: 'model',
    type: 'select',
    currentValue: 'fast',
    options: [
      {
        group: 'small',
        name: 'Small',
        options: [{ value: 'fast', name: 'Fast' }],
      },
      {
        group: 'large',
        name: 'Large',
        options: [{ value: 'deep', name: 'Deep' }],
      },
    ],
  },
  { id: 'fast', name: 'Fast mode', type: 'boolean', currentValue: false },
];

type Choice =
  | { configId: string; type: 'boolean'; value: boolean }
  | { configId: string; type: 'id'; value: string };

const choice = (configId: string, value: string | boolean): Choice =>
  typeof value === 'boolean'
    ? { configId, type: 'boolean', value }
    : { configId, type: 'id', value };

it.each([
  { name: 'applies a listed choice', configId: 'mode', value: 'code' },
  { name: 'applies a choice inside a group', configId: 'model', value: 'deep' },
  { name: 'applies either value of a switch', configId: 'fast', value: true },
])('$name', async ({ configId, value }) => {
  const host = await startAcpEngine({ steps: [], configOptions: offered });
  const created = await host.caller.session.new(emptySessionInput);

  const applied = await host.caller.session.setConfigOption({
    ...created,
    ...choice(configId, value),
  });

  expect(
    applied.configOptions.find((option) => option.configId === configId)
      ?.currentValue,
  ).toBe(value);
});

it.each([
  { name: 'refuses an unlisted choice', configId: 'mode', value: 'plan' },
  {
    name: 'refuses an unlisted grouped choice',
    configId: 'model',
    value: 'small',
  },
  { name: 'refuses a word for a switch', configId: 'fast', value: 'true' },
  { name: 'refuses a switch value for a list', configId: 'mode', value: true },
  {
    name: 'refuses a setting the Agent did not offer',
    configId: 'effort',
    value: 'high',
  },
])('$name', async ({ configId, value }) => {
  const host = await startAcpEngine({ steps: [], configOptions: offered });
  const created = await host.caller.session.new(emptySessionInput);

  await expect(
    host.caller.session.setConfigOption({
      ...created,
      ...choice(configId, value),
    }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: `The Agent did not offer ${configId}=${String(value)}`,
  });
});
