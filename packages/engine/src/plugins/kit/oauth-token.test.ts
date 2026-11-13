import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakeProvider, linear, tokenReply } from '#mocks/oauth-provider';
import {
  afterOneHour,
  answered,
  expiring,
  keptSecret,
  nested,
  oneHour,
  signedIn,
  signedInAt,
  useSignInClock,
} from '#mocks/oauth-sign-in';

beforeEach(useSignInClock);

afterEach(() => {
  vi.useRealTimers();
});

it('keeps the refresh token beside the access token, with when it runs out', async () => {
  const provider = await signedIn(
    fakeProvider(answered(expiring('token-1', 'refresh-1'))),
  );

  expect(keptSecret(provider)).toEqual({
    access: 'token-1',
    refresh: 'refresh-1',
    expiresAtMs: signedInAt.getTime() + oneHour * 1000,
  });
});

it('keeps and refreshes a refresh token the service nests beside its token', async () => {
  const provider = await signedIn(
    fakeProvider(
      answered(nested('token-1', 'refresh-1')),
      answered(nested('token-2', 'refresh-2')),
    ),
    { ...linear, tokenPath: ['authed_user', 'access_token'] },
  );

  afterOneHour();

  expect(await provider.borrow('account-1')).toBe('token-2');
  expect(keptSecret(provider)).toMatchObject({ refresh: 'refresh-2' });
});

it('keeps the refresh token when the service sends its lifetime as a string', async () => {
  const body = {
    access_token: 'token-1',
    refresh_token: 'refresh-1',
    expires_in: '3600',
  };

  const provider = await signedIn(
    fakeProvider(tokenReply(true, JSON.stringify(body))),
  );

  expect(keptSecret(provider)).toEqual({
    access: 'token-1',
    refresh: 'refresh-1',
  });
});

it('keeps a token that never runs out as the bare string', async () => {
  const provider = await signedIn(fakeProvider());

  expect(provider.seen.secrets.get('account-1')).toBe('token-1');
});
