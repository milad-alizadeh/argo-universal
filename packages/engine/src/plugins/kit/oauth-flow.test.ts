import { setImmediate } from 'node:timers/promises';
import { expect, it } from 'vitest';
import {
  fakeProvider,
  linear,
  redirectUri,
  tokenReply,
} from '#mocks/oauth-provider';
import { oauthFlow } from './oauth-flow';

const callback = { code: 'code-1', verifier: 'verifier-1' };

const signedIn = { kind: 'signed-in', label: 'Milad' };

it('answers waiting once the browser opens, then adds the Account and keeps its token', async () => {
  const provider = fakeProvider();
  const flow = oauthFlow(provider.argo, linear);

  expect(await flow.start()).toEqual({ kind: 'waiting' });

  const authorize = new URL(provider.seen.authorize[0] ?? '');
  expect(authorize.origin + authorize.pathname).toBe(linear.authorizeUrl);
  expect(Object.fromEntries(authorize.searchParams)).toEqual({
    response_type: 'code',
    client_id: 'client-1',
    redirect_uri: redirectUri,
    state: 'state-1',
    code_challenge: 'challenge-1',
    code_challenge_method: 'S256',
    scope: 'read write',
  });

  provider.browser.resolve(callback);
  await expect.poll(() => flow.state()).toEqual(signedIn);

  expect(provider.seen.added).toEqual([{ host: linear.host, label: 'Milad' }]);
  expect(provider.seen.secrets.get('account-1')).toBe('token-1');
  expect(
    Object.fromEntries(new URLSearchParams(provider.seen.tokenBodies[0])),
  ).toEqual({
    grant_type: 'authorization_code',
    client_id: 'client-1',
    code: 'code-1',
    code_verifier: 'verifier-1',
    redirect_uri: redirectUri,
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

  await expect.poll(() => flow.state()).toEqual({ kind: 'idle' });
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
  provider.browser.resolve(callback);
  // Every continuation of the browser's answer runs before the next turn of the event loop.
  await setImmediate();

  expect(flow.state()).toEqual({ kind: 'idle' });
  expect(provider.seen.added).toEqual([]);
  expect(provider.seen.tokenBodies).toEqual([]);
});

it('fails with the service’s own reason when the token endpoint refuses the code', async () => {
  const provider = fakeProvider(
    tokenReply(
      false,
      '{"error":"bad_verification","error_description":"The code\\nis wrong."}',
    ),
  );

  const flow = oauthFlow(provider.argo, linear);

  await flow.start();
  provider.browser.resolve(callback);

  await expect
    .poll(() => flow.state())
    .toEqual({
      kind: 'failed',
      reason: 'failed',
      message:
        'The service refused the sign-in (401): bad_verification, The code is wrong.',
    });
});

it('fails with the reason a service gives in an answer marked ok', async () => {
  const provider = fakeProvider(
    tokenReply(true, '{"error":"bad_verification_code"}'),
  );

  const flow = oauthFlow(provider.argo, linear);

  await flow.start();
  provider.browser.resolve(callback);

  await expect
    .poll(() => flow.state())
    .toMatchObject({
      kind: 'failed',
      message: 'The service refused the sign-in (200): bad_verification_code',
    });
});

it('fails with the status when the answer is not JSON', async () => {
  const provider = fakeProvider(tokenReply(false, 'Bad gateway'));

  const flow = oauthFlow(provider.argo, linear);

  await flow.start();
  provider.browser.resolve(callback);

  await expect
    .poll(() => flow.state())
    .toMatchObject({
      kind: 'failed',
      message: 'The service did not return a token (401).',
    });
});

it('reads a token the service nests where the Plugin says', async () => {
  const provider = fakeProvider(
    tokenReply(true, '{"ok":true,"authed_user":{"access_token":"token-1"}}'),
  );

  const flow = oauthFlow(provider.argo, {
    ...linear,
    tokenPath: ['authed_user', 'access_token'],
  });

  await flow.start();
  provider.browser.resolve(callback);

  await expect.poll(() => flow.state()).toEqual(signedIn);
});

it('provides the kept token to borrowers in the header the flow names', async () => {
  const provider = fakeProvider();
  const header = { header: 'X-Api-Key', prefix: '' };

  await oauthFlow(provider.argo, { ...linear, header }).provide();
  provider.seen.secrets.set('account-1', 'token-1');

  expect(provider.seen.provided).toEqual([{ host: linear.host, header }]);
  expect(
    await provider.seen.handler?.({
      id: 'account-1',
      host: linear.host,
      label: 'Milad',
      providedBy: 'linear',
    }),
  ).toBe('token-1');
});
