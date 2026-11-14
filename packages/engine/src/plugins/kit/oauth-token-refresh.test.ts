import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakeProvider, linear, tokenReply } from '#mocks/oauth-provider';
import {
  afterOneHour,
  answered,
  expiring,
  keptSecret,
  oneHour,
  refreshBodies,
  signedIn,
  useSignInClock,
} from '#mocks/oauth-sign-in';

beforeEach(useSignInClock);

afterEach(() => {
  vi.useRealTimers();
});

// A client ID the Plugin keeps in its Settings, read when it is needed.
const clientIdFromSettings = (): Promise<string> =>
  Promise.resolve('client-from-settings');

const rotating = (): ReturnType<typeof fakeProvider> =>
  fakeProvider(
    answered(expiring('token-1', 'refresh-1')),
    answered(expiring('token-2', 'refresh-2')),
  );

it('refreshes a token that has run out as a public client, with the client ID and refresh token alone', async () => {
  const provider = await signedIn(rotating());

  afterOneHour();

  expect(await provider.borrow('account-1')).toBe('token-2');
  expect(refreshBodies(provider)).toEqual([
    {
      grant_type: 'refresh_token',
      client_id: 'client-1',
      refresh_token: 'refresh-1',
    },
  ]);
});

it('keeps the refreshed pair, so the next borrow lends it without refreshing again', async () => {
  const provider = await signedIn(rotating());

  afterOneHour();
  await provider.borrow('account-1');

  expect(await provider.borrow('account-1')).toBe('token-2');
  expect(refreshBodies(provider)).toHaveLength(1);
});

it('lends a token that is still fresh without refreshing', async () => {
  const provider = await signedIn(rotating());

  expect(await provider.borrow('account-1')).toBe('token-1');
  expect(refreshBodies(provider)).toEqual([]);
});

it('spends a refresh token once when borrows that find it due arrive together', async () => {
  const provider = await signedIn(rotating());

  afterOneHour();
  await Promise.all([
    provider.borrow('account-1'),
    provider.borrow('account-1'),
  ]);

  expect(refreshBodies(provider)).toHaveLength(1);
});

it('reads a client ID kept in Settings when it refreshes', async () => {
  const provider = await signedIn(rotating(), {
    ...linear,
    clientId: clientIdFromSettings,
  });

  afterOneHour();
  await provider.borrow('account-1');

  expect(refreshBodies(provider)[0]).toMatchObject({
    client_id: 'client-from-settings',
  });
});

it('keeps the old refresh token when the refresh answer gives none', async () => {
  const body = { access_token: 'token-2', expires_in: oneHour };

  const provider = await signedIn(
    fakeProvider(
      answered(expiring('token-1', 'refresh-1')),
      tokenReply(true, JSON.stringify(body)),
    ),
  );

  afterOneHour();
  await provider.borrow('account-1');

  expect(keptSecret(provider)).toMatchObject({ refresh: 'refresh-1' });
});

it('lends the old token when the service refuses the refresh, so the read finds the person signed out', async () => {
  const provider = await signedIn(
    fakeProvider(
      answered(expiring('token-1', 'refresh-1')),
      tokenReply(false, '{"error":"invalid_grant"}'),
    ),
  );

  afterOneHour();

  expect(await provider.borrow('account-1')).toBe('token-1');
});
