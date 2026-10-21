import { expect, it } from 'vitest';
import { PluginManifest } from './plugins';

const accountHost = 'api.github.com';

const manifest = {
  id: 'provider',
  name: 'Provider',
  version: '1.0.0',
  engines: { argo: '^1.0.0' },
  main: 'index.js',
  icon: { sf: 'person' },
  contributes: {
    nav: [],
    accounts: [{ host: accountHost, page: '/sign-in' }],
  },
  capabilities: [{ kind: 'fetch', host: accountHost }],
};

it('accepts an Account host declared verbatim as a fetch Capability', () => {
  expect(PluginManifest.safeParse(manifest).success).toBe(true);
});

it('refuses a wildcard Capability in place of the Account host, naming the missing host', () => {
  const result = PluginManifest.safeParse({
    ...manifest,
    capabilities: [{ kind: 'fetch', host: '*', reason: 'Public APIs' }],
  });

  expect(result.error?.message).toContain(accountHost);
});

it.each([
  '*',
  'localhost',
  'localhost:8080',
  'localhost.',
  'login.localhost.:8080',
  'login.localhost',
  '127.0.0.1',
  '[::1]',
  'https://api.github.com',
  'api.github.com/path',
])('refuses the non-concrete Account host %s', (host) => {
  expect(
    PluginManifest.safeParse({
      ...manifest,
      contributes: { nav: [], accounts: [{ host, page: '/sign-in' }] },
      capabilities: [{ kind: 'fetch', host, reason: 'Fixture host' }],
    }).success,
  ).toBe(false);
});

it('requires the Capability to include the Account port', () => {
  const result = PluginManifest.safeParse({
    ...manifest,
    contributes: {
      nav: [],
      accounts: [{ host: 'api.github.com:8443', page: '/sign-in' }],
    },
  });

  expect(result.error?.message).toContain('api.github.com:8443');
});

it('names the host when an Account declaration omits its page', () => {
  const result = PluginManifest.safeParse({
    ...manifest,
    contributes: { nav: [], accounts: [accountHost] },
    capabilities: [{ kind: 'fetch', host: '*', reason: 'Public APIs' }],
  });

  expect(result.error?.message).toContain(accountHost);
});

it('accepts a concrete public address with its explicit fetch Capability', () => {
  const host = '8.8.8.8:8443';
  expect(
    PluginManifest.safeParse({
      ...manifest,
      contributes: { nav: [], accounts: [{ host, page: '/sign-in' }] },
      capabilities: [{ kind: 'fetch', host, reason: 'Private deployment' }],
    }).success,
  ).toBe(true);
});
