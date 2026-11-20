import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller } from '#mocks/operations';
import { drawnRoot, pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const refuse = {
  name: 'refuse',
  label: 'Refuse',
  description: 'Fails, as a Plugin Operation can.',
  tier: 'act' as const,
  policy: 'allow' as const,
  params: {
    level: { type: 'number' as const, description: 'The level.' },
  },
};

async function controls(
  policy: 'allow' | 'ask' | 'person-only' = 'allow',
): Promise<Awaited<ReturnType<typeof startEngineTestHost>>> {
  const home = await createRuntimePlugins([
    {
      id: 'controls',
      fixture: 'control-actions',
      operations: [{ ...refuse, policy }],
    },
  ]);

  return startEngineTestHost({ home });
}

it('draws each keyed Action child of SplitButton and a Slider with its own value', async () => {
  const { caller } = await controls();

  await expect(
    drawnRoot(caller, pageAt('controls', '/')),
  ).resolves.toMatchObject({
    children: [
      { props: { children: 'Waiting' } },
      {
        type: 'SplitButton',
        children: [
          {
            key: 'first',
            props: { onPress: { pageState: { result: 'First' } } },
          },
          {
            key: 'second',
            props: { onPress: { pageState: { result: 'Second' } } },
          },
          {
            key: 'refuse',
            props: { onPress: { operation: 'refuse', args: { level: 1 } } },
          },
        ],
      },
      {
        key: 'slider',
        props: { onValueChange: { pageState: { level: { $payload: true } } } },
      },
    ],
  });
  await expect(
    drawnRoot(caller, pageAt('controls', '/', { level: 5 })),
  ).resolves.toMatchObject({
    children: [{}, {}, { key: 'slider', props: { value: 5 } }],
  });
}, 20_000);

it('answers a failed Operation with its error and refuses args of the wrong type, and the Plugin keeps running', async () => {
  const { caller } = await controls();
  const run = { pluginId: 'controls', operation: 'refuse' };

  await expect(
    caller.plugins.run({ ...run, args: { level: 1 } }),
  ).rejects.toThrow('Secondary refused');
  await expect(
    caller.plugins.run({ ...run, args: { level: 'high' } }),
  ).rejects.toThrow('Param level must be a number');
  expect(await caller.plugin.list()).toMatchObject({
    plugins: [{ state: 'running', error: null }],
  });
}, 20_000);

it.each(['ask', 'person-only'] as const)(
  'enforces the Plugin’s %s policy for a CLI caller',
  async (policy) => {
    const host = await controls(policy);
    const cli = await operationCaller(host);
    const id = 'controls.refuse';
    const rows = await cli.operations.list.query({ filter: id });

    const row = expect.objectContaining({ id, policy, enabled: false });
    const expected = policy === 'person-only' ? [] : [row];

    expect(rows).toEqual(expected);

    await expect(
      cli.operations.run.mutate({ id, params: { level: 1 } }),
    ).rejects.toThrow(policy === 'ask' ? 'active Turn' : 'Only an App');
    await expect(
      host.caller.plugins.run({
        pluginId: 'controls',
        operation: 'refuse',
        args: { level: 1 },
      }),
    ).rejects.toThrow('Secondary refused');
  },
  20_000,
);
