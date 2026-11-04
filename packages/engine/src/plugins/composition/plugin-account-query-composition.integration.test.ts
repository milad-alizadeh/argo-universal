import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { accountPlugins, accountNetwork } from '#mocks/account-plugins';
import { startEngineTestHost } from '#mocks/engine';
import type { EngineConnections } from '#mocks/engine-read';
import { drawnRoot, pageAt, textOf } from '#mocks/plugin-pages';
import { installed, registeredProject } from '#mocks/probe-plugin';
import { PluginTestClock } from '../worker/test-clock';

// A Loader page that reads one Account-borrowing fetch Query and draws its status or why it has none.
const borrowingPage = (url: string, every = ''): string => `
    import { Text } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    export function register(argo) {
      argo.pages.define('/', {
        ${every}
        load: ({ read }) => read({ api: 'fetch', url: '${url}', account: 'api.github.com' }).then(
          (data) => ({ status: data.status }),
          (error) => ({ error: error.message }),
        ),
        render: (shown) => jsx(Text, { children: JSON.stringify(shown) }),
      });
    }`;

// What the page shows: the fetch's status, or why the Query has no answer.
const Shown = z.union([
  z.strictObject({ status: z.number() }),
  z.strictObject({ error: z.string() }),
]);

async function drawnText(
  caller: EngineConnections['caller'],
  address: { pluginId: string; projectId: string },
): Promise<z.infer<typeof Shown>> {
  const root = await drawnRoot(caller, {
    ...pageAt(address.pluginId, '/'),
    projectId: address.projectId,
  });

  return Shown.parse(JSON.parse(textOf(root)));
}

it('reports an unavailable Borrow as a Query error', async () => {
  await registeredProject();

  const fixture = await installed(borrowingPage('https://api.github.com/'), {
    capabilities: [{ kind: 'fetch', host: 'api.github.com' }],
  });

  const host = await startEngineTestHost({ home: fixture.home });
  const [project] = await host.caller.project.list();

  if (!project) throw new Error('Missing fixture Project');

  await expect(
    drawnText(host.caller, { pluginId: 'probe', projectId: project.id }),
  ).resolves.toEqual({ error: 'Refused: Account is unavailable' });
}, 30_000);

it('keeps the last successful Query data when a refreshed Borrow is refused', async () => {
  await registeredProject();
  const fixture = await accountPlugins('null');
  await writeFile(
    join(fixture.home, 'shipped/borrower/index.mjs'),
    borrowingPage('https://api.github.com/done', 'every: 10000,'),
  );
  const network = await accountNetwork();
  const clock = new PluginTestClock(0);

  const host = await startEngineTestHost({
    home: fixture.home,
    pluginNetwork: network.pluginNetwork,
    pluginClock: clock,
  });

  await host.caller.plugin.activate({ pluginId: 'probe' });
  const [project] = await host.caller.project.list();

  if (!project) throw new Error('Missing fixture Project');
  const address = { pluginId: 'borrower', projectId: project.id };

  await expect(drawnText(host.caller, address)).resolves.toEqual({
    status: 200,
  });
  const [account] = await host.caller.plugins.accounts.list();

  if (!account) throw new Error('Missing fixture Account');
  await host.caller.plugins.accounts.grant({
    host: account.host,
    account: account.id,
    plugin: 'borrower',
    allowed: false,
  });
  await clock.advance(10000);
  await expect(drawnText(host.caller, address)).resolves.toEqual({
    status: 200,
  });
  expect(network.received).toHaveLength(1);
}, 30_000);
