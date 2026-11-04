import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { accountNetwork, accountPlugins } from '#mocks/account-plugins';
import { startEngineTestHost } from '#mocks/engine';
import { drawnRoot, pageAt, textOf } from '#mocks/plugin-pages';
import { registeredProject } from '#mocks/probe-plugin';
import { PluginTestClock } from '../worker/test-clock';

/*
 * A Loader page whose named read and paged list each borrow the Account: the read and the list are the
 * Plugin's own code that Argo calls for the page, so their `argo` calls are for the page's Project.
 */
const borrowingReads = `
    import { Text } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    const borrowed = async () => {
      const account = await argo.accounts.get('api.github.com');
      const response = await argo.fetch('https://api.github.com/done', { account: 'api.github.com' });
      return { account: account !== null, worked: response ? (await response.json()).worked : null };
    };
    export function register(argo) {
      const read = argo.queries.define('borrowed', borrowed);
      argo.pages.define('/', {
        load: ({ read: readQuery }) => readQuery(read({})),
        list: async () => ({ items: [await borrowed()], cursor: null }),
        render: (read, _to, { list }) => jsx(Text, { children: JSON.stringify({ read, list: list.items }) }),
      });
    }`;

const borrowedShown = { account: true, worked: true };

it('borrows the Account for its Project from a named read and a paged list', async () => {
  await registeredProject();
  const fixture = await accountPlugins('null');
  await writeFile(
    join(fixture.home, 'shipped/borrower/index.mjs'),
    borrowingReads,
  );
  const network = await accountNetwork();

  const host = await startEngineTestHost({
    home: fixture.home,
    pluginNetwork: network.pluginNetwork,
    pluginClock: new PluginTestClock(0),
  });

  await host.caller.plugin.activate({ pluginId: 'probe' });
  const [project] = await host.caller.project.list();

  if (!project) throw new Error('Missing fixture Project');

  const root = await drawnRoot(host.caller, {
    ...pageAt('borrower', '/'),
    projectId: project.id,
  });

  expect(JSON.parse(textOf(root))).toEqual({
    read: borrowedShown,
    list: [borrowedShown],
  });
}, 30_000);
