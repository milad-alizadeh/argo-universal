import type { PluginCapability } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import {
  fetchLimit,
  localhost,
  redirectTo,
  serving,
} from '#mocks/fetch-fixture-server';
import { refusal, refusedLines, runProbe } from '#mocks/probe-run';

const undeclared = 'not a declared host';

const notHttps = 'not HTTPS';

const privateAddress = 'private address';

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
    reason: privateAddress,
  },
  {
    name: 'a name that resolves to loopback under * with a reason',
    url: (port: number): string => `https://rebind.fixture.test:${port}/`,
    reason: privateAddress,
    extra: [anywhere],
  },
  {
    name: 'a raw loopback address under *',
    url: (port: number): string => `https://127.0.0.1:${port}/`,
    reason: privateAddress,
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

it('refuses a Host header that would reach another site on the same address, logging it once', async () => {
  const port = await serving();

  const { results, log } = await runProbe({
    calls: {
      refused: `argo.fetch('https://localhost:${port}/', { headers: { Host: 'example.com' } })`,
    },
    capabilities: [localhost(port)],
    network: true,
  });

  expect(results).toEqual({
    refused: { error: 'Refused: The Host header is never allowed' },
  });
  expect(log.split('\n').filter((line) => line.includes('argo.fetch'))).toEqual(
    [expect.stringContaining('Plugin probe: refused argo.fetch GET')],
  );
});
