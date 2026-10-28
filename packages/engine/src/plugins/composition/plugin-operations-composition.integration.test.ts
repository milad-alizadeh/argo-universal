import { expect, it } from 'vitest';
import { startPluginOperations } from '#mocks/plugin-operations';

const activatePluginId = 'plugin.activate';

it('lists Plugins through operations.run with the user token', async () => {
  const { operations } = await startPluginOperations();
  expect(
    await operations.run.mutate({ id: 'plugin.list', params: {} }),
  ).toMatchObject({
    plugins: [
      { manifest: { id: 'probe' }, enabled: true, state: 'not-started' },
    ],
    errors: [],
  });
});

it('starts a Plugin through operations.run with the user token', async () => {
  const { operations } = await startPluginOperations();
  expect(
    await operations.run.mutate({
      id: activatePluginId,
      params: { pluginId: 'probe' },
    }),
  ).toMatchObject({ state: 'running', error: null });
});

it('turns a running Plugin off through operations.run with the user token', async () => {
  const { operations } = await startPluginOperations();
  await operations.run.mutate({
    id: activatePluginId,
    params: { pluginId: 'probe' },
  });
  expect(
    await operations.run.mutate({
      id: 'plugin.setEnabled',
      params: { pluginId: 'probe', enabled: false },
    }),
  ).toEqual({ ok: true });
  expect(
    await operations.run.mutate({ id: 'plugin.list', params: {} }),
  ).toMatchObject({ plugins: [{ enabled: false, state: 'not-started' }] });
  await expect(
    operations.run.mutate({
      id: activatePluginId,
      params: { pluginId: 'probe' },
    }),
  ).rejects.toThrow('Plugin probe is turned off');
});

it('reads and changes Plugin settings through operations.run without exposing secrets', async () => {
  const { operations } = await startPluginOperations();
  expect(
    await operations.run.mutate({
      id: 'plugin.getSettings',
      params: { pluginId: 'probe' },
    }),
  ).toMatchObject({ values: { host: 'github.com' }, secretsSet: [] });
  expect(
    await operations.run.mutate({
      id: 'plugin.setSetting',
      params: { pluginId: 'probe', key: 'host', value: 'github.example.com' },
    }),
  ).toEqual({ ok: true });
  await operations.run.mutate({
    id: 'plugin.setSetting',
    params: { pluginId: 'probe', key: 'token', value: 'fixture-private-token' },
  });

  const settings = await operations.run.mutate({
    id: 'plugin.getSettings',
    params: { pluginId: 'probe' },
  });

  expect(settings).toMatchObject({
    values: { host: 'github.example.com' },
    secretsSet: ['token'],
  });
  expect(JSON.stringify(settings)).not.toContain('fixture-private-token');
});
