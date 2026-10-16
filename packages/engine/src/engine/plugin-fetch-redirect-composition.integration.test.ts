import type { PluginCapability } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import { localhost, redirectTo, serving } from '#mocks/fetch-fixture-server';
import { runProbe } from '#mocks/probe-run';

// The Server follows redirects itself, as the Fetch standard does (ADR-0030).
const credentials = `{ headers: { Authorization: 'Bearer synthetic', Cookie: 'c=1', 'X-Custom': 'kept' } }`;

const loopback = (port: number): PluginCapability => ({
  kind: 'fetch',
  host: `127.0.0.1:${port}`,
  reason: 'The fixture server by address',
});

it.each([
  {
    name: 'keeps credentials on a same-origin redirect',
    target: (port: number): string => `https://localhost:${port}/headers`,
    expected: {
      authorization: 'Bearer synthetic',
      cookie: 'c=1',
      custom: 'kept',
    },
  },
  {
    name: 'drops credentials on a redirect to another origin',
    target: (port: number): string => `https://127.0.0.1:${port}/headers`,
    expected: { authorization: null, cookie: null, custom: 'kept' },
  },
])('$name', async ({ target, expected }) => {
  const port = await serving();

  const { results } = await runProbe({
    calls: {
      redirected: `argo.fetch(${JSON.stringify(redirectTo(port, target(port)))}, ${credentials}).then((r) => r.json())`,
    },
    capabilities: [localhost(port), loopback(port)],
    network: true,
  });

  expect(results).toEqual({ redirected: { value: expected } });
});

it('turns a POST into a GET without its body on a 303', async () => {
  const port = await serving();

  const { results } = await runProbe({
    calls: {
      seeOther: `argo.fetch('https://localhost:${port}/see-other', { method: 'POST', body: 'x' }).then((r) => r.json())`,
    },
    capabilities: [localhost(port)],
    network: true,
  });

  expect(results).toEqual({ seeOther: { value: { method: 'GET', url: '/' } } });
});

it('stops after 10 redirects', async () => {
  const port = await serving();

  const { results } = await runProbe({
    calls: { loop: `argo.fetch('https://localhost:${port}/loop')` },
    capabilities: [localhost(port)],
    network: true,
  });

  expect(results).toEqual({ loop: { error: 'More than 10 redirects' } });
});
