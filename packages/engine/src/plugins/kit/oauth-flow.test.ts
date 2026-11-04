import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
} from '@repo/contracts/plugins/oauth-flow-api';
import { expect, it } from 'vitest';
import { oauthFlow } from './oauth-flow';

type Reply = Awaited<ReturnType<OAuthFlowArgo['fetch']>>;

type Callback = { code: string; verifier: string } | null;

const reply = (ok: boolean, body: unknown): Reply => ({
  ok,
  status: ok ? 200 : 401,
  statusText: '',
  headers: {},
  body: JSON.stringify(body),
  truncated: false,
  text: () => Promise.resolve(JSON.stringify(body)),
  json: () => Promise.resolve(body),
});

// A fake provider: Argo's redirect, whose browser the test finishes, a token endpoint, and the Accounts kept.
function fakeProvider(token: Reply = reply(true, { access_token: 'token-1' })) {
  const browser = Promise.withResolvers<Callback>();
  const seen = {
    authorize: [] as string[],
    tokenBodies: [] as (string | undefined)[],
    added: [] as { host: string; label: string }[],
    secrets: new Map<string, string>(),
    changes: 0,
  };
  let start: () => Promise<unknown> = () =>
    Promise.resolve({
      redirectUri: 'http://127.0.0.1:51789/callback',
      state: 'state-1',
      codeChallenge: 'challenge-1',
      codeChallengeMethod: 'S256',
    });

  const argo: OAuthFlowArgo = {
    oauth: {
      start: () => start() as ReturnType<OAuthFlowArgo['oauth']['start']>,
      await: (_state, url) => {
        seen.authorize.push(url);

        return browser.promise;
      },
    },
    fetch: (_url, init) => {
      seen.tokenBodies.push(init?.body);

      return Promise.resolve(token);
    },
    accounts: {
      add: (host, { label }) => {
        seen.added.push({ host, label });

        return Promise.resolve('account-1');
      },
      get: () => Promise.resolve(null),
      provide: () => Promise.resolve(),
    },
    secrets: {
      get: (id) => Promise.resolve(seen.secrets.get(id) ?? null),
      set: (id, value) => Promise.resolve(void seen.secrets.set(id, value)),
      delete: (id) => Promise.resolve(void seen.secrets.delete(id)),
    },
    changed: () => {
      seen.changes += 1;
    },
  };

  return {
    argo,
    seen,
    browser,
    failStart: (error: Error) => {
      start = () => Promise.reject(error);
    },
  };
}

const linear: OAuthFlowOptions = {
  host: 'api.linear.app',
  authorizeUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  clientId: 'client-1',
  scopes: ['read', 'write'],
  label: (token) => Promise.resolve(token === 'token-1' ? 'Milad' : null),
};

const settled = (flow: ReturnType<typeof oauthFlow>) =>
  expect.poll(() => flow.state());

it('answers waiting once the browser opens, then adds the Account and keeps its token', async () => {
  const provider = fakeProvider();
  const flow = oauthFlow(provider.argo, linear);

  expect(await flow.start()).toEqual({ kind: 'waiting' });

  const authorize = new URL(provider.seen.authorize[0] ?? '');
  expect(authorize.origin + authorize.pathname).toBe(linear.authorizeUrl);
  expect(Object.fromEntries(authorize.searchParams)).toEqual({
    response_type: 'code',
    client_id: 'client-1',
    redirect_uri: 'http://127.0.0.1:51789/callback',
    state: 'state-1',
    code_challenge: 'challenge-1',
    code_challenge_method: 'S256',
    scope: 'read write',
  });

  provider.browser.resolve({ code: 'code-1', verifier: 'verifier-1' });
  await settled(flow).toEqual({ kind: 'signed-in', label: 'Milad' });

  expect(provider.seen.added).toEqual([
    { host: 'api.linear.app', label: 'Milad' },
  ]);
  expect(provider.seen.secrets.get('account-1')).toBe('token-1');
  expect(
    Object.fromEntries(new URLSearchParams(provider.seen.tokenBodies[0])),
  ).toEqual({
    grant_type: 'authorization_code',
    client_id: 'client-1',
    code: 'code-1',
    code_verifier: 'verifier-1',
    redirect_uri: 'http://127.0.0.1:51789/callback',
  });
  // Waiting, then signed in: each change redraws the page.
  expect(provider.seen.changes).toBe(2);
});

it('reads the client ID when a sign-in starts and fails without one', async () => {
  const provider = fakeProvider();
  const flow = oauthFlow(provider.argo, { ...linear, clientId: () => null });

  expect(await flow.start()).toEqual({
    kind: 'failed',
    reason: 'failed',
    message: 'This Plugin has no OAuth client ID yet.',
  });
  expect(provider.seen.authorize).toEqual([]);
});

it('is idle again after a denial in the browser', async () => {
  const provider = fakeProvider();
  const flow = oauthFlow(provider.argo, linear);

  await flow.start();
  provider.browser.resolve(null);

  await settled(flow).toEqual({ kind: 'idle' });
  expect(provider.seen.added).toEqual([]);
});

it('says when another program holds the callback port', async () => {
  const provider = fakeProvider();
  provider.failStart(new Error('Port 51789 is already in use'));
  const flow = oauthFlow(provider.argo, linear);

  expect(await flow.start()).toEqual({
    kind: 'failed',
    reason: 'port-in-use',
    message: 'Port 51789 is already in use',
  });
});

it('adds no Account for a sign-in cancelled before the browser answered', async () => {
  const provider = fakeProvider();
  const flow = oauthFlow(provider.argo, linear);

  await flow.start();
  expect(flow.cancel()).toEqual({ kind: 'idle' });
  provider.browser.resolve({ code: 'code-1', verifier: 'verifier-1' });
  await new Promise((settle) => setTimeout(settle, 10));

  expect(flow.state()).toEqual({ kind: 'idle' });
  expect(provider.seen.added).toEqual([]);
  expect(provider.seen.tokenBodies).toEqual([]);
});

it('fails when the token endpoint refuses the code', async () => {
  const provider = fakeProvider(reply(false, { error: 'bad_verification' }));
  const flow = oauthFlow(provider.argo, linear);

  await flow.start();
  provider.browser.resolve({ code: 'code-1', verifier: 'verifier-1' });

  await settled(flow).toEqual({
    kind: 'failed',
    reason: 'failed',
    message: 'The service did not return a token.',
  });
});

it('reads a token the service nests where the Plugin says', async () => {
  const provider = fakeProvider(
    reply(true, { ok: true, authed_user: { access_token: 'token-1' } }),
  );
  const flow = oauthFlow(provider.argo, {
    ...linear,
    readToken: (answer) => Object(Object(answer).authed_user).access_token,
  });

  await flow.start();
  provider.browser.resolve({ code: 'code-1', verifier: 'verifier-1' });

  await settled(flow).toEqual({ kind: 'signed-in', label: 'Milad' });
});

it('provides the kept token to borrowers in the header the flow names', async () => {
  const provider = fakeProvider();
  const provided: unknown[] = [];
  provider.argo.accounts.provide = (host, header, handler) => {
    provided.push({ host, header });
    provider.seen.secrets.set('account-1', 'token-1');

    return handler({
      id: 'account-1',
      host,
      label: 'Milad',
      providedBy: 'linear',
    }).then((token) => void provided.push(token));
  };

  await oauthFlow(provider.argo, {
    ...linear,
    header: { header: 'X-Api-Key', prefix: '' },
  }).provide();

  expect(provided).toEqual([
    { host: 'api.linear.app', header: { header: 'X-Api-Key', prefix: '' } },
    'token-1',
  ]);
});
