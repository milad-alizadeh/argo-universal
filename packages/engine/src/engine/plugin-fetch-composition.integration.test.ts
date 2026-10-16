import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PluginCapability } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import { httpsServer } from '#mocks/probe-plugin';
import { refusal, refusedLines, runProbe } from '#mocks/probe-run';

const fetchLimit = 5_242_880;

const undeclared = 'not a declared host';

const notHttps = 'not HTTPS';

const redirectPrefix = '/to/';

// `/big` is over the cap, `/same` redirects home, `/to/<url>` redirects to the URL; anything else echoes.
const routes = new Map<string, (response: ServerResponse) => void>([
  ['/big', (response): void => void response.end('x'.repeat(fetchLimit + 1))],
  [
    '/same',
    (response): void => void response.writeHead(302, { location: '/' }).end(),
  ],
]);

const serving = (): Promise<number> =>
  httpsServer((request, response) => {
    const route = routes.get(request.url ?? '');

    if (route) return route(response);

    redirectOrEcho(request, response);
  });

function redirectOrEcho(
  { url = '', method }: IncomingMessage,
  response: ServerResponse,
): void {
  if (!url.startsWith(redirectPrefix))
    return void response.end(JSON.stringify({ method, url }));

  response
    .writeHead(307, {
      location: decodeURIComponent(url.slice(redirectPrefix.length)),
    })
    .end();
}

const localhost = (port: number): PluginCapability => ({
  kind: 'fetch',
  host: `localhost:${port}`,
  reason: 'The fixture server',
});

const redirectTo = (port: number, target: string): string =>
  `https://localhost:${port}${redirectPrefix}${encodeURIComponent(target)}`;

it('fetches a declared host over HTTPS, follows an allowed redirect and caps the body', async () => {
  const port = await serving();

  const { results } = await runProbe({
    calls: {
      post: `argo.fetch('https://localhost:${port}/', { method: 'POST', body: 'x' }).then((r) => r.json())`,
      redirect: `argo.fetch('https://localhost:${port}/same').then((r) => r.json())`,
      big: `argo.fetch('https://localhost:${port}/big').then((r) => ({ truncated: r.truncated, length: r.body.length }))`,
    },
    capabilities: [localhost(port)],
    network: true,
  });

  expect(results).toEqual({
    post: { value: { method: 'POST', url: '/' } },
    redirect: { value: { method: 'GET', url: '/' } },
    big: { value: { truncated: true, length: fetchLimit } },
  });
});

const anywhere: PluginCapability = {
  kind: 'fetch',
  host: '*',
  reason: 'Anywhere, never this Mac',
};

it.each([
  {
    name: 'plain HTTP',
    url: (port: number): string => `http://localhost:${port}/`,
    reason: notHttps,
  },
  {
    name: 'an undeclared host',
    url: (): string => 'https://example.com/',
    reason: undeclared,
  },
  {
    name: 'a declared host on another port',
    url: (): string => 'https://localhost:1/',
    reason: undeclared,
  },
  {
    name: 'a redirect to an undeclared host',
    url: (port: number): string => redirectTo(port, 'https://example.com/'),
    reason: undeclared,
  },
  {
    name: 'a redirect to plain HTTP',
    url: (port: number): string =>
      redirectTo(port, 'http://localhost:'.concat(String(port), '/')),
    reason: notHttps,
  },
  {
    name: 'a name that resolves to loopback without a reason',
    url: (port: number): string => `https://api.fixture.test:${port}/`,
    reason: 'private address',
  },
  {
    name: 'a raw loopback address under *',
    url: (port: number): string => `https://127.0.0.1:${port}/`,
    reason: 'private address',
    extra: [anywhere],
  },
])('refuses $name and logs it once', async ({ url, reason, extra = [] }) => {
  const port = await serving();

  const { results, log } = await runProbe({
    calls: { refused: `argo.fetch(${JSON.stringify(url(port))})` },
    capabilities: [
      localhost(port),
      { kind: 'fetch', host: `api.fixture.test:${port}` },
      ...extra,
    ],
    network: true,
  });

  expect(results).toEqual({ refused: refusal(reason) });
  expect(refusedLines(log)).toEqual([
    expect.stringContaining('Plugin probe: refused argo.fetch GET'),
  ]);
});

it('refuses a Host header that would reach another site on the same address', async () => {
  const port = await serving();

  const { results } = await runProbe({
    calls: {
      refused: `argo.fetch('https://localhost:${port}/', { headers: { Host: 'example.com' } })`,
    },
    capabilities: [localhost(port)],
    network: true,
  });

  expect(results).toEqual({
    refused: { error: 'Refused: The Host header is never allowed' },
  });
});
