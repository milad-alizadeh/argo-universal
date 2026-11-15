import { expect, it } from 'vitest';
import { fakeProvider, linear, tokenReply } from '#mocks/oauth-provider';
import { oauthFlow } from './oauth-flow';

// A service that requires the OAuth app's client secret, as Atlassian and Google do; the person supplies it.
const callback = { code: 'code-1', verifier: 'verifier-1' };

const signedIn = { kind: 'signed-in', label: 'Milad' };

it('sends the client secret on the code exchange, and never in the browser', async () => {
  const provider = fakeProvider();

  const flow = oauthFlow(provider.argo, {
    ...linear,
    clientSecret: () => 'secret-1',
  });

  await flow.start();
  provider.browser.resolve(callback);
  await expect.poll(() => flow.state()).toEqual(signedIn);

  expect(provider.seen.authorize[0]).not.toContain('secret-1');
  expect(
    Object.fromEntries(new URLSearchParams(provider.seen.tokenBodies[0])),
  ).toMatchObject({ client_id: 'client-1', client_secret: 'secret-1' });
});

it('fails without asking the browser when the client secret is not set yet', async () => {
  const provider = fakeProvider();

  const flow = oauthFlow(provider.argo, {
    ...linear,
    clientSecret: () => null,
  });

  expect(await flow.start()).toEqual({
    kind: 'failed',
    reason: 'failed',
    message:
      'This Plugin has no OAuth client secret yet. Set it in the Plugin’s settings.',
  });
  expect(provider.seen.authorize).toEqual([]);
});

it('does not repeat the client secret when the service quotes it in a refusal', async () => {
  const provider = fakeProvider(
    tokenReply(
      false,
      '{"error":"invalid_client","error_description":"bad secret secret-1"}',
    ),
  );

  const flow = oauthFlow(provider.argo, {
    ...linear,
    clientSecret: 'secret-1',
  });

  await flow.start();
  provider.browser.resolve(callback);

  await expect
    .poll(() => flow.state())
    .toEqual({
      kind: 'failed',
      reason: 'failed',
      message:
        'The service refused the sign-in (401): invalid_client, bad secret [secret]',
    });
});
