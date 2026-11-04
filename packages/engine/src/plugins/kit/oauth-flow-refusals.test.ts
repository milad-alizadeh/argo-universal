import { expect, it } from 'vitest';
import { fakeProvider, linear, tokenReply } from '#mocks/oauth-provider';
import { oauthFlow } from './oauth-flow';

const callback = { code: 'code-1', verifier: 'verifier-1' };

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
