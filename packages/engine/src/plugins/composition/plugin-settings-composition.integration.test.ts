import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { MemoryKeychain } from '#mocks/memory-keychain';
import {
  defaultHost,
  probeSettings,
  settingsProbe,
  showClosed,
} from '#mocks/plugin-settings';
import { installed, probeResult, probeSource } from '#mocks/probe-plugin';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

// Starting a Plugin bundles it first, which is slow on a busy machine.
const pollOptions = { timeout: 30_000 };

it('answers each setting with its default until the user changes it', async () => {
  const home = await createRuntimePlugins([settingsProbe]);
  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugin.getSettings({ pluginId: 'probe' })).toEqual({
    values: { host: defaultHost, [showClosed]: false, sort: 'updated' },
    secretsSet: [],
  });
});

it('keeps changed settings across Engine restarts', async () => {
  const home = await createRuntimePlugins([settingsProbe]);
  const first = await startEngineTestHost({ home });

  await first.caller.plugin.setSetting({
    pluginId: 'probe',
    key: 'host',
    value: 'github.example.com',
  });
  await first.caller.plugin.setSetting({
    pluginId: 'probe',
    key: showClosed,
    value: true,
  });
  await first.stop();

  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugin.getSettings({ pluginId: 'probe' })).toEqual({
    values: {
      host: 'github.example.com',
      [showClosed]: true,
      sort: 'updated',
    },
    secretsSet: [],
  });
});

it('keeps a secret setting in the Keychain and tells the App only that it is set', async () => {
  const keychain = new MemoryKeychain();
  const home = await createRuntimePlugins([settingsProbe]);
  const { caller } = await startEngineTestHost({ home, keychain });

  await caller.plugin.setSetting({
    pluginId: 'probe',
    key: 'token',
    value: 'ghp_fixture',
  });

  expect([...keychain.entries.values()]).toEqual(['ghp_fixture']);
  expect(await caller.plugin.getSettings({ pluginId: 'probe' })).toMatchObject({
    secretsSet: ['token'],
  });
  expect(
    JSON.stringify(await caller.plugin.getSettings({ pluginId: 'probe' })),
  ).not.toContain('ghp_fixture');
});

it('clears a secret setting when it is set to empty', async () => {
  const keychain = new MemoryKeychain();
  const home = await createRuntimePlugins([settingsProbe]);
  const { caller } = await startEngineTestHost({ home, keychain });
  const token = { pluginId: 'probe', key: 'token' };

  await caller.plugin.setSetting({ ...token, value: 'ghp_fixture' });
  await caller.plugin.setSetting({ ...token, value: '' });

  expect(keychain.entries.size).toBe(0);
  expect(await caller.plugin.getSettings({ pluginId: 'probe' })).toMatchObject({
    secretsSet: [],
  });
});

it.each([
  { change: { key: 'missing', value: 'x' }, error: 'has no setting missing' },
  { change: { key: 'host', value: true }, error: 'host takes text' },
  {
    change: { key: showClosed, value: 'yes' },
    error: 'show-closed takes on or off',
  },
  {
    change: { key: 'sort', value: 'stars' },
    error: 'stars is not an option of sort',
  },
])(
  'refuses a setting change the schema does not allow: $error',
  async ({ change, error }) => {
    const home = await createRuntimePlugins([settingsProbe]);
    const { caller } = await startEngineTestHost({ home });

    await expect(
      caller.plugin.setSetting({ pluginId: 'probe', ...change }),
    ).rejects.toThrow(error);
  },
);

it('lets the Plugin read its settings, secrets included', async () => {
  const keychain = new MemoryKeychain();

  const { home, data } = await installed(
    probeSource({
      host: "argo.settings.get('host')",
      token: "argo.settings.get('token')",
      showClosed: "argo.settings.get('show-closed')",
      sort: "argo.settings.get('sort')",
      missing: "argo.settings.get('missing')",
    }),
    { settings: probeSettings },
  );

  const { caller } = await startEngineTestHost({ home, keychain });

  await caller.plugin.setSetting({
    pluginId: 'probe',
    key: 'token',
    value: 'ghp_fixture',
  });
  await caller.plugin.setSetting({
    pluginId: 'probe',
    key: 'sort',
    value: 'created',
  });
  await caller.plugin.activate({ pluginId: 'probe' });

  await expect
    .poll(() => probeResult(data).catch(() => null), pollOptions)
    .toEqual({
      host: { value: defaultHost },
      token: { value: 'ghp_fixture' },
      showClosed: { value: false },
      sort: { value: 'created' },
      missing: { error: 'Plugin probe has no setting missing' },
    });
});
