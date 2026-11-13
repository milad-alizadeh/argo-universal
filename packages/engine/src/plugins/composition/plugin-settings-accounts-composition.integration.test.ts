import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { probeSettings } from '#mocks/plugin-settings';
import { installed } from '#mocks/probe-plugin';

it('draws sign-in inventory and secret Settings without starting the providing Plugin', async () => {
  const accounts = [{ host: 'api.fixture.test', page: '/sign-in' }];
  const { home } = await installed(
    "export function register() { throw new Error('Settings must not start this Plugin'); }",
    {
      accounts,
      settings: probeSettings,
      capabilities: [{ kind: 'fetch', host: 'api.fixture.test' }],
    },
  );
  const { caller } = await startEngineTestHost({ home });
  expect(await caller.plugins.accounts.list()).toEqual([]);
  expect(await caller.plugin.getSettings({ pluginId: 'probe' })).toMatchObject({
    secretsSet: [],
  });
  expect((await caller.plugin.list()).plugins).toContainEqual(
    expect.objectContaining({
      manifest: expect.objectContaining({
        contributes: expect.objectContaining({ accounts }),
      }),
      state: 'not-started',
    }),
  );
});
