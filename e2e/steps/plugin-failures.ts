import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { expect } from '../fixtures';
import { dropConnection, awaitReconnection } from './connection-drop';
import { Given, When, Then } from './fixtures';
import { mutate, query } from './server-query';
import { toast } from './toasts';

const fixtureDirectory = new URL(
  '../../packages/engine/mocks/plugins/first-party/tracker',
  import.meta.url,
);

const crashingEntry = new URL(
  '../../packages/engine/mocks/plugin-runtime/crashing.mjs',
  import.meta.url,
);

Given('a crashing Plugin is installed', async ({ app }): Promise<void> => {
  // The e2e Server's first-party root: only first-party Plugins load (ADR-0030).
  const plugins = join(dirname(app.projectPath), 'server-home/shipped-plugins');
  await mkdir(plugins, { recursive: true });
  await cp(fixtureDirectory, join(plugins, 'broken'), { recursive: true });
  await cp(crashingEntry, join(plugins, 'broken/index.js'));
  await writeCompatibleManifest(join(plugins, 'broken/plugin.json'));
});

async function writeCompatibleManifest(manifest: string): Promise<void> {
  const fixture = z
    .record(z.string(), z.json())
    .parse(JSON.parse(await readFile(manifest, 'utf8')));

  await writeFile(
    manifest,
    JSON.stringify({ ...fixture, engines: { argo: '>=0.0.0 <2' } }),
  );
}

When(
  'the crashing Plugin starts alongside Counter',
  async ({ page, app }): Promise<void> => {
    for (const pluginId of ['counter', 'fixture-tracker'])
      await mutate({
        page,
        httpUrl: app.httpUrl,
        procedure: 'plugin.activate',
        input: { pluginId },
      });
  },
);

const title = 'Fixture tracker stopped';

Then(
  'an error toast names the crashed Plugin',
  async ({ page }): Promise<void> => {
    await expect(toast(page, title)).toBeVisible();
    await expect(toast(page, 'Fixture Plugin crashed')).toBeVisible();
    await expect(toast(page, 'Counter stopped')).toHaveCount(0);
  },
);

const pluginStates = z.object({
  plugins: z.array(
    z.object({ manifest: z.object({ id: z.string() }), state: z.string() }),
  ),
});

Then('Counter is still running', async ({ page, app }): Promise<void> => {
  const result = await query({
    page,
    httpUrl: app.httpUrl,
    procedure: 'plugin.list',
    input: {},
    output: pluginStates,
  });

  expect(result.plugins).toContainEqual({
    manifest: { id: 'counter' },
    state: 'running',
  });
});

Then(
  'the Plugin crash toast stays dismissed',
  async ({ page }): Promise<void> => {
    // Check immediately so a repeated toast cannot expire into a passing assertion.
    expect(await toast(page, title).count()).toBe(0);
  },
);

When('the Plugin crash toast dismisses', async ({ page }): Promise<void> => {
  await expect(toast(page, title)).toHaveCount(0, { timeout: 10_000 });
});

When(
  'the Connection reconnects to the same Plugin failure',
  async ({ page }): Promise<void> => {
    const replay = page.waitForEvent('websocket').then((socket) =>
      socket.waitForEvent('framereceived', {
        predicate: ({ payload }) =>
          String(payload).includes('"key"') &&
          String(payload).includes('Fixture Plugin crashed'),
      }),
    );

    await dropConnection(page);
    await replay;
    await awaitReconnection(page);
  },
);
