import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { accountNetwork, accountPlugins } from '#mocks/account-plugins';
import { startEngineTestHost } from '#mocks/engine';
import { drawnRoot, pageAt, textOf } from '#mocks/plugin-pages';
import { registeredProject } from '#mocks/probe-plugin';
import { PluginTestClock } from '../worker/test-clock';

const journeyMs = 30_000;

// A page that asks for the Account and borrows it, drawn with or without a Project.
const borrowingPage = `
    const borrowed = async (argo) => {
      const account = await argo.accounts.get('api.github.com');
      const response = await argo.fetch('https://api.github.com/done', { account: 'api.github.com' });
      return { account: account?.label ?? null, worked: response ? (await response.json()).worked : null };
    };
    const page = (argo) => ({ load: () => borrowed(argo), render: (shown) => jsx(Text, { children: JSON.stringify(shown) }) });`;

const kitImports = `
    import { Text } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';`;

// The provider adds one Account for api.github.com and lends it, as the fixture provider does.
const providerSource = (
  labels: string[],
): string => `${kitImports}${borrowingPage}
    export async function register(argo) {
      argo.pages.define('/', page(argo));
      for (const label of ${JSON.stringify(labels)}) {
        const id = await argo.accounts.add('api.github.com', { label });
        await argo.secrets.set(id, 'synthetic-token');
      }
      await argo.accounts.provide('api.github.com', { header: 'X-Api-Key', prefix: '' }, (account) => argo.secrets.get(account.id));
    }`;

const borrowerSource = `${kitImports}${borrowingPage}
    export function register(argo) { argo.pages.define('/', page(argo)); }`;

async function drawWithoutProject(
  pluginId: string,
  labels: string[] = ['Milad'],
): Promise<{ shown: unknown; received: unknown[] }> {
  await registeredProject();
  const fixture = await accountPlugins('null');

  await writeFile(fixture.entry, providerSource(labels));
  await writeFile(
    join(fixture.home, 'shipped/borrower/index.mjs'),
    borrowerSource,
  );
  const network = await accountNetwork();

  const host = await startEngineTestHost({
    home: fixture.home,
    pluginNetwork: network.pluginNetwork,
    pluginClock: new PluginTestClock(0),
  });

  await host.caller.plugin.activate({ pluginId: 'probe' });

  const root = await drawnRoot(host.caller, pageAt(pluginId, '/'));

  return { shown: JSON.parse(textOf(root)), received: network.received };
}

it(
  'lends a provider the one Account it provides when its call has no Project',
  async () => {
    const { shown, received } = await drawWithoutProject('probe');

    expect(shown).toEqual({ account: 'Milad', worked: true });
    expect(received).toEqual([
      { host: 'api.github.com', token: 'synthetic-token' },
    ]);
  },
  journeyMs,
);

it(
  'lends nothing without a Project when the provider has two Accounts for the host',
  async () => {
    const { shown, received } = await drawWithoutProject('probe', [
      'Milad',
      'Work',
    ]);

    expect(shown).toEqual({ account: null, worked: null });
    expect(received).toEqual([]);
  },
  journeyMs,
);

it(
  'lends another Plugin nothing when its call has no Project',
  async () => {
    const { shown, received } = await drawWithoutProject('borrower');

    expect(shown).toEqual({ account: null, worked: null });
    expect(received).toEqual([]);
  },
  journeyMs,
);
