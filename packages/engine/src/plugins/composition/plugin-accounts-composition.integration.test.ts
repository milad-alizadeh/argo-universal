import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installed, probeResult, probeSource } from '#mocks/probe-plugin';

const journeyMs = 30_000;

const accountHost = 'api.github.com';

it(
  'keeps Accounts across Server restarts without exposing a token',
  async () => {
    const { home } = await installed(
      probeSource({
        added: "argo.accounts.add('api.github.com', { label: 'Milad' })",
      }).replace(
        'const results = {};',
        "argo.pages.define('/', { load: () => null, render: () => null }); const results = {};",
      ),
      {
        capabilities: [{ kind: 'fetch', host: accountHost }],
        accounts: [{ host: accountHost, page: '/' }],
      },
    );

    const first = await startEngineTestHost({ home });
    expect(
      await first.caller.plugin.activate({ pluginId: 'probe' }),
    ).toMatchObject({ state: 'running' });
    const accounts = await first.caller.plugins.accounts.list();
    expect(accounts).toEqual([
      {
        id: expect.any(String),
        host: accountHost,
        label: 'Milad',
        providedBy: 'probe',
      },
    ]);
    await first.stop();
    const second = await startEngineTestHost({ home });
    expect(await second.caller.plugins.accounts.list()).toEqual(accounts);
  },
  journeyMs,
);

it(
  'gives the Account back when a Plugin adds the same person again, so signing in again keeps one',
  async () => {
    const add = "argo.accounts.add('api.github.com', { label: 'Milad' })";
    const other = add.replace('Milad', 'Sam');

    const { home, data } = await installed(
      probeSource({ first: add, again: add, another: other }).replace(
        'const results = {};',
        "argo.pages.define('/', { load: () => null, render: () => null }); const results = {};",
      ),
      {
        capabilities: [{ kind: 'fetch', host: accountHost }],
        accounts: [{ host: accountHost, page: '/' }],
      },
    );

    const host = await startEngineTestHost({ home });

    await host.caller.plugin.activate({ pluginId: 'probe' });

    const { first, again, another } = await probeResult(data);
    const accounts = await host.caller.plugins.accounts.list();

    expect(again).toEqual(first);
    expect(another).not.toEqual(first);
    expect(accounts.map(({ label }) => label).toSorted()).toEqual([
      'Milad',
      'Sam',
    ]);
  },
  journeyMs,
);
