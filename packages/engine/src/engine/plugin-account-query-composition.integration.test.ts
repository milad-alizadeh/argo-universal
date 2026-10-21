import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { accountPlugins, accountNetwork } from '#mocks/account-plugins';
import { startEngineTestHost } from '#mocks/engine';
import { installed, registeredProject } from '#mocks/probe-plugin';
import { PluginTestClock } from '../plugins/worker/test-clock';

it('reports an unavailable Borrow as a Query error', async () => {
  await registeredProject();

  const fixture = await installed(
    `
    import { useData, useEffect, Text } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    export function register(argo) {
      argo.pages.register('/', function Page() {
        const {data, error} = useData({api:'fetch', url:'https://api.github.com/', account:'api.github.com'});
        useEffect(() => {
          if (data !== undefined || error) void argo.fs.write('$DATA/out.json', JSON.stringify({data: data === undefined ? 'unavailable' : data, error: error ?? null}));
        }, [data, error]);
        return jsx(Text, {children:'Query'});
      });
    }`,
    { capabilities: [{ kind: 'fetch', host: 'api.github.com' }] },
  );

  const host = await startEngineTestHost({ home: fixture.home });
  const [project] = await host.caller.projects.list();

  if (!project) throw new Error('Missing fixture Project');

  const view = await host.caller.plugins.view({
    pluginId: 'probe',
    path: '/',
    projectId: project.id,
  });

  await view[Symbol.asyncIterator]().next();
  await expect
    .poll(() => readResult(fixture.data), { timeout: 10_000 })
    .toEqual({ data: 'unavailable', error: 'Refused: Account is unavailable' });
}, 30_000);

it('keeps the last successful Query data when a refreshed Borrow is refused', async () => {
  await registeredProject();
  const fixture = await accountPlugins('null');
  await writeFile(
    join(fixture.home, 'shipped/borrower/index.mjs'),
    `
    import { useData, useEffect, Text } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    export function register(argo) {
      argo.pages.register('/', function Page() {
        const {data, error, stale} = useData({api:'fetch', url:'https://api.github.com/done', account:'api.github.com'}, {every:10000});
        useEffect(() => {
          if (data !== undefined || error) void argo.fs.write('${fixture.borrowerData}/out.json', JSON.stringify({status:data?.status ?? null,error:error ?? null,stale}));
        }, [data,error,stale]);
        return jsx(Text, {children:'Query'});
      });
    }`,
  );
  const network = await accountNetwork();
  const clock = new PluginTestClock(0);

  const host = await startEngineTestHost({
    home: fixture.home,
    pluginNetwork: network.pluginNetwork,
    pluginClock: clock,
  });

  await host.caller.plugins.activate({ pluginId: 'probe' });
  const [project] = await host.caller.projects.list();

  if (!project) throw new Error('Missing fixture Project');

  const view = await host.caller.plugins.view({
    pluginId: 'borrower',
    path: '/',
    projectId: project.id,
  });

  await view[Symbol.asyncIterator]().next();
  await expect
    .poll(() => readResult(fixture.borrowerData), { timeout: 10_000 })
    .toEqual({ status: 200, error: null, stale: false });
  const [account] = await host.caller.plugins.accounts.list();

  if (!account) throw new Error('Missing fixture Account');
  await host.caller.plugins.accounts.grant({
    host: account.host,
    account: account.id,
    plugin: 'borrower',
    allowed: false,
  });
  await clock.advance(10000);
  await expect
    .poll(() => readResult(fixture.borrowerData), { timeout: 10_000 })
    .toEqual({
      status: 200,
      error: 'Refused: Account is unavailable',
      stale: false,
    });
  expect(network.received).toHaveLength(1);
}, 30_000);

const readResult = async (
  directory: string,
): Promise<z.infer<ReturnType<typeof z.json>>> =>
  z
    .json()
    .parse(JSON.parse(await readFile(join(directory, 'out.json'), 'utf8')));
