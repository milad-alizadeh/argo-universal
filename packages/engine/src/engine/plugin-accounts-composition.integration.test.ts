import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installed, probeSource } from '#mocks/probe-plugin';

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
        "argo.pages.register('/', () => null); const results = {};",
      ),
      {
        capabilities: [{ kind: 'fetch', host: accountHost }],
        accounts: [{ host: accountHost, page: '/' }],
      },
    );

    const first = await startEngineTestHost({ home });
    expect(
      await first.caller.plugins.activate({ pluginId: 'probe' }),
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
