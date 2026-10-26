import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';
import { account, fakeArgo, reply } from './fake-argo';
import { createSignIn, provideAccount } from './github-oauth';

const portMessage =
  'Port 51789 is already in use. Free the port, then try again.';

test('signing in exchanges the code, adds the Account and keeps the token under its id', async () => {
  const { calls, log } = fakeArgo();

  assert.deepEqual(await createSignIn(calls)(), {
    kind: 'signed-in',
    label: 'octocat',
  });
  assert.deepEqual(log.added, [{ host: 'api.github.com', label: 'octocat' }]);
  assert.equal(log.secrets.get('account-1'), 'token-1');
});

test('the authorize URL carries the PKCE challenge, S256 and Argo state, and the exchange the verifier', async () => {
  const { calls, log } = fakeArgo();

  await createSignIn(calls)();
  const authorize = log.authorize.join('');

  assert.match(authorize, /[?&]code_challenge=challenge(&|$)/);
  assert.match(authorize, /[?&]code_challenge_method=S256(&|$)/);
  assert.match(authorize, /[?&]state=state-1(&|$)/);
  assert.match(
    log.requests.map(({ body }) => body).join(''),
    /code_verifier=verifier-1/,
  );
});

test('a taken port is reported as such and nothing is stored', async () => {
  const start = (): Promise<never> => Promise.reject(new Error(portMessage));
  const { calls, log } = fakeArgo({ start });

  assert.deepEqual(await createSignIn(calls)(), {
    kind: 'port-in-use',
    message: portMessage,
  });
  assert.equal(log.added.length, 0);
});

test('a denied or timed out exchange is cancelled, not failed', async () => {
  const { calls, log } = fakeArgo({ result: null });

  assert.deepEqual(await createSignIn(calls)(), { kind: 'cancelled' });
  assert.equal(log.requests.length, 0);
});

test('a missing client ID fails before Argo is asked to start', async () => {
  const { calls, log } = fakeArgo({ clientId: null });

  assert.equal((await createSignIn(calls)()).kind, 'failed');
  assert.equal(log.authorize.length, 0);
});

test('a refused token exchange fails without adding an Account', async () => {
  const { calls, log } = fakeArgo({ token: reply(false, {}) });

  assert.equal((await createSignIn(calls)()).kind, 'failed');
  assert.equal(log.added.length, 0);
});

test('the provider is registered for the Account host with the Authorization header', async () => {
  const { calls, log } = fakeArgo();

  await provideAccount(calls);
  assert.deepEqual(log.provided, [
    { host: 'api.github.com', header: 'Authorization', prefix: 'Bearer' },
  ]);
});

test('the provider handler answers with the token stored under the Account id', async () => {
  const { calls, log } = fakeArgo();

  await provideAccount(calls);
  log.secrets.set('account-1', 'token-1');
  assert.equal(await log.handler?.(account('account-1')), 'token-1');
  assert.equal(await log.handler?.(account('other')), null);
});
