import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const PluginList = z.object({
  plugins: z.array(
    z.object({
      manifest: z.object({ id: z.string() }),
      state: z.enum(['running', 'crashed', 'not-started']),
    }),
  ),
});

import type { Page } from '@playwright/test';
import { type App, expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { query, mutate } from './server-query';

const pluginId = 'account-settings-probe';

const host = 'api.fixture.test';

const manifest = {
  id: pluginId,
  name: 'Account probe',
  version: '1.0.0',
  engines: { argo: '>=0.0.0 <2' },
  main: 'index.mjs',
  icon: {},
  capabilities: [{ kind: 'fetch', host }],
  contributes: { nav: [], accounts: [{ host, page: '/sign-in' }] },
};

const sourceFor = (state: string): string => `
  import { Text } from '@argo/plugin-kit';
  import { jsx } from '@argo/plugin-kit/jsx-runtime';
  export async function register(argo) {
    ${state === 'crashed' ? "throw new Error('Fixture crash');" : ''}
    argo.pages.define('/sign-in', {
      load: ({ context }) => context.serverDevice,
      render: () => jsx(Text, { children: 'Fixture sign-in page' }),
    });
    ${state === 'signed-in' ? "await argo.accounts.add('api.fixture.test', { label: 'Fixture' });" : ''}
  }
`;

async function installAccountPlugin(
  projectPath: string,
  state: string,
): Promise<void> {
  const folder = join(
    dirname(projectPath),
    'server-home/shipped-plugins',
    pluginId,
  );

  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, 'plugin.json'), JSON.stringify(manifest));
  await writeFile(join(folder, 'index.mjs'), sourceFor(state));
}

type Server = { app: App; page: Page };

async function prepareState(server: Server, state: string): Promise<void> {
  if (['signed-in', 'crashed'].includes(state))
    await changePlugin(server, 'plugin.activate', { pluginId });

  if (state === 'signed-in')
    await changePlugin(server, 'plugin.setEnabled', {
      pluginId,
      enabled: false,
    });
}

const changePlugin = (
  { app, page }: Server,
  procedure: string,
  input: { pluginId: string; enabled?: boolean },
): Promise<void> => mutate({ page, httpUrl: app.httpUrl, procedure, input });

Given('an Account Plugin is {word}', async (server, state: string) => {
  await installAccountPlugin(server.app.projectPath, state);
  await prepareState(server, state);
});

When('I open the Account Plugin settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: /^Plugins(?:,|$)/ }).click();
  await page.getByRole('link', { name: 'Account probe', exact: true }).click();
});

Then(
  'the Account Plugin row says {string} without starting its worker',
  async ({ page, app }, label: string) => {
    await expect(
      page.getByRole('link', { name: `${host}, ${label}` }),
    ).toBeVisible();

    const list = await query({
      page,
      httpUrl: app.httpUrl,
      procedure: 'plugin.list',
      input: {},
      output: PluginList,
    });

    const plugin = list.plugins.find((entry) => entry.manifest.id === pluginId);
    expect(plugin).toBeDefined();
    expect(plugin?.state).not.toBe('running');
  },
);

When('I follow the Account Plugin row', async ({ page }) => {
  await page.getByRole('link', { name: new RegExp(`^${host},`) }).click();
});

Then(
  'the Account Plugin destination is {string}',
  async ({ page }, destination: string) => {
    if (destination === 'account') {
      await expect(page).toHaveURL(/\/settings\/accounts\/[^/]+$/);
      await expect(
        page.getByRole('heading', { name: 'Account detail', exact: true }),
      ).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/settings\/plugins\/sign-in\//);

      if (destination === 'sign-in')
        await expect(
          page.getByText('Fixture sign-in page', { exact: true }),
        ).toBeVisible();
    }
  },
);
