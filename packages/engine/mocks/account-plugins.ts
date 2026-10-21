import { writeFile } from 'node:fs/promises';
import { request } from 'node:https';
import { join } from 'node:path';
import type { PluginNetwork } from '../src/plugins';
import { installed, fixtureNetwork, httpsServer } from './probe-plugin';
import { writePlugin } from './runtime-plugins';

export const accountHost = 'api.github.com';

// Provider and borrower run in separate workers, through the real Engine Plugin API.
type AccountPlugins = Awaited<ReturnType<typeof installed>> & {
  borrowerData: string;
};

export async function accountPlugins(
  expression: string,
): Promise<AccountPlugins> {
  const probe = await installed(
    `export async function register(argo) {
    argo.pages.register('/', () => null);
    let id = await argo.secrets.get('account-id');
    if (!id) { id = await argo.accounts.add('${accountHost}', { label: 'Milad' });
      await argo.secrets.set('account-id', id); await argo.secrets.set(id, 'synthetic-token'); }
    await argo.accounts.provide('${accountHost}', { header: 'X-Api-Key', prefix: '' }, (account) => argo.secrets.get(account.id));
  }`,
    {
      accounts: [{ host: accountHost, page: '/' }],
      capabilities: [{ kind: 'fetch', host: accountHost }],
    },
  );

  await writePlugin(probe.home, {
    id: 'borrower',
    fixture: 'healthy',
    capabilities: [{ kind: 'fetch', host: '*', reason: 'Fixture APIs' }],
  });
  await writeFile(
    join(probe.home, 'shipped/borrower/index.mjs'),
    `
    import { useEffect, Text } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    export function register(argo) { argo.pages.register('/', function Page() {
      useEffect(() => { (async () => ${expression})().then(
        (value) => argo.fs.write('${probe.home}/plugin-data/borrower/out.json', JSON.stringify({ result: { value: value ?? null } })),
        (error) => argo.fs.write('${probe.home}/plugin-data/borrower/out.json', JSON.stringify({ result: { error: error.message } }))
      ); }, []); return jsx(Text, { children: 'Probe' });
    }); }
  `,
  );

  return { ...probe, borrowerData: join(probe.home, 'plugin-data/borrower') };
}

type ReceivedRequest = { host: string; token: string | undefined };

type AccountNetwork = {
  received: ReceivedRequest[];
  pluginNetwork: PluginNetwork;
};

export async function accountNetwork(): Promise<AccountNetwork> {
  const received: { host: string; token: string | undefined }[] = [];

  const port = await httpsServer((req, res) => {
    received.push({
      host: req.headers.host ?? '',
      token: headerValue(req.headers['x-api-key']),
    });

    if (req.url === '/redirect') {
      res.writeHead(302, { location: 'https://other.example/done' });
      res.end();
    } else {
      res.setHeader('content-type', 'application/json');
      res.end('{"worked":true}');
    }
  });

  // A boundary adapter maps the synthetic public origins to the local TLS fixture.
  const pluginNetwork: PluginNetwork = {
    ...(await fixtureNetwork()),
    request: (url, options) =>
      request(new URL(`https://127.0.0.1:${port}${url.pathname}`), {
        ...options,
        servername: 'localhost',
        headers: { ...options.headers, host: url.host },
      }),
  };

  return { pluginNetwork, received };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join(', ') : value;
}
