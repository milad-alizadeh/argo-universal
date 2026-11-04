import { request } from 'node:https';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { serialiseOnOAuthPort } from '#mocks/oauth-port-lock';
import {
  fixtureNetwork,
  httpsServer,
  installed,
  registeredProject,
} from '#mocks/probe-plugin';
import type { PluginNetwork } from '../index';
import { PluginTestClock } from '../worker/test-clock';

serialiseOnOAuthPort();

const host = 'api.service.example';

/*
 * A Plugin signs in through the kit's OAuth flow, from an Operation that answers at once: the flow waits for
 * the browser past the run, exchanges the code at the service, and adds the Account it names.
 */
const source = `
  import { oauthFlow } from '@argo/plugin-kit';
  export async function register(argo) {
    const signIn = oauthFlow(argo, {
      host: '${host}',
      authorizeUrl: 'https://${host}/authorize',
      tokenUrl: 'https://${host}/token',
      clientId: 'client-1',
      label: async (token) => (token === 'token-1' ? 'Milad' : null),
    });
    argo.operations.register('signIn', () => signIn.start());
    argo.pages.define('/', { load: () => signIn.state(), render: () => null });
    await signIn.provide();
  }`;

const signInOperation = {
  name: 'signIn',
  label: 'Sign in',
  description: 'Starts a sign-in in the browser.',
  tier: 'act' as const,
};

// The service's token endpoint, at its public name, answering a token for any code.
async function serviceNetwork(): Promise<PluginNetwork> {
  const port = await httpsServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end('{"access_token":"token-1"}');
  });

  return {
    ...(await fixtureNetwork()),
    request: (url, options) =>
      request(new URL(`https://127.0.0.1:${port}${url.pathname}`), {
        ...options,
        servername: 'localhost',
        headers: { ...options.headers, host: url.host },
      }),
  };
}

it('signs in through the OAuth flow from an Operation and redraws when the Account is added', async () => {
  await registeredProject();

  const { home } = await installed(source, {
    accounts: [{ host, page: '/' }],
    capabilities: [{ kind: 'fetch', host }],
    operations: [signInOperation],
  });

  const opened: string[] = [];

  const engine = await startEngineTestHost({
    home,
    pluginClock: new PluginTestClock(0),
    pluginNetwork: await serviceNetwork(),
    pluginOAuth: { open: async (url) => void opened.push(url) },
  });

  const controller = new AbortController();

  const marks = (
    await engine.createCaller({ signal: controller.signal }).plugins.stale()
  )[Symbol.asyncIterator]();

  await engine.caller.plugin.activate({ pluginId: 'probe' });

  const run = await engine.caller.plugins.run({
    pluginId: 'probe',
    operation: 'signIn',
    args: {},
  });

  expect(run.result).toEqual({ kind: 'waiting' });
  await expect.poll(() => opened.length, { timeout: 10_000 }).toBe(1);

  // The run's own mark, then the one the flow says once the Account is added.
  await marks.next();
  const authorize = new URL(opened[0] ?? '');
  const callback = authorize.searchParams.get('redirect_uri');
  const state = authorize.searchParams.get('state');
  await fetch(`${callback}?state=${state}&code=code-1`);

  expect((await marks.next()).value).toEqual({ pluginId: 'probe' });
  await expect
    .poll(() => engine.caller.plugins.accounts.list(), { timeout: 10_000 })
    .toEqual([expect.objectContaining({ host, label: 'Milad' })]);
  controller.abort();
}, 30_000);
