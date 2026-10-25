import { setTimeout } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installed, registeredProject } from '#mocks/probe-plugin';

const accountHost = 'api.github.com';

it('refuses a Grant for an unavailable Account without blocking later writes', async () => {
  const { home } = await installed('export function register() {}');
  const host = await startEngineTestHost({ home });

  const result = host.caller.plugins.accounts
    .grant({
      host: accountHost,
      account: 'gone',
      plugin: 'probe',
      allowed: true,
    })
    .then(
      () => 'committed',
      (error: Error) => error.message,
    );

  expect(await Promise.race([result, setTimeout(1500, 'pending')])).toBe(
    'Account is unavailable',
  );
  await host.caller.plugins.setEnabled({ pluginId: 'probe', enabled: false });
  expect((await host.caller.plugins.list()).plugins[0]?.enabled).toBe(false);
}, 30_000);

it('refuses an Account choice for an unavailable Project without blocking later writes', async () => {
  const host = await accountProvider();
  const [account] = await host.caller.plugins.accounts.list();

  if (!account) throw new Error('Missing fixture Account');

  const result = host.caller.plugins.accounts
    .choose({ host: account.host, account: account.id, projectId: 'gone' })
    .then(
      () => 'committed',
      (error: Error) => error.message,
    );

  expect(await Promise.race([result, setTimeout(1500, 'pending')])).toBe(
    'Project is unavailable',
  );
  await host.caller.plugins.setEnabled({ pluginId: 'probe', enabled: false });
}, 30_000);

it('keeps writes available when sign-out races a Grant and Project choice', async () => {
  await registeredProject();
  const host = await accountProvider();
  const [account] = await host.caller.plugins.accounts.list();
  const [project] = await host.caller.projects.list();

  if (!account || !project)
    throw new Error('Missing Account or Project fixture');

  const changed = Promise.allSettled([
    host.caller.plugins.accounts.signOut({ id: account.id }),
    host.caller.plugins.accounts.choose({
      host: account.host,
      account: account.id,
      projectId: project.id,
    }),
    host.caller.plugins.accounts.grant({
      host: account.host,
      account: account.id,
      plugin: 'probe',
      allowed: true,
    }),
  ]);

  expect(
    await Promise.race([
      changed.then(() => 'settled'),
      setTimeout(1500, 'pending'),
    ]),
  ).toBe('settled');
  expect(await host.caller.plugins.accounts.list()).toEqual([]);
  expect(await host.caller.plugins.accounts.grants({ id: account.id })).toEqual(
    [],
  );
  await host.caller.plugins.setEnabled({ pluginId: 'probe', enabled: false });
}, 30_000);

async function accountProvider(): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>>
> {
  const { home } = await installed(
    `export async function register(argo) {
    argo.pages.register('/', () => null);
    await argo.accounts.add('api.github.com', {label:'Milad'});
  }`,
    {
      accounts: [{ host: accountHost, page: '/' }],
      capabilities: [{ kind: 'fetch', host: accountHost }],
    },
  );

  const host = await startEngineTestHost({ home });
  expect(
    await host.caller.plugins.activate({ pluginId: 'probe' }),
  ).toMatchObject({ state: 'running' });

  return host;
}
