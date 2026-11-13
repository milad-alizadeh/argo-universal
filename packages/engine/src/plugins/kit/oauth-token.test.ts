import type { OAuthFlowOptions } from '@repo/contracts/plugins/oauth-flow-api';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  fakeProvider,
  linear,
  tokenReply,
  type FakeProvider,
} from '#mocks/oauth-provider';
import { KeptToken } from './kept-token';
import { oauthFlow } from './oauth-flow';

const signedInAt = new Date('2026-11-13T07:10:00Z');

const oneHour = 60 * 60;

beforeEach(() => {
  // Only the clock is faked: the flow's own waits still run.
  vi.useFakeTimers({ now: signedInAt, toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

type ExpiringAnswer = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type NestedAnswer = { ok: boolean; authed_user: ExpiringAnswer };

const answered = (
  body: ExpiringAnswer | NestedAnswer,
): ReturnType<typeof tokenReply> => tokenReply(true, JSON.stringify(body));

const expiring = (access: string, refresh: string): ExpiringAnswer => ({
  access_token: access,
  refresh_token: refresh,
  expires_in: oneHour,
});

// An answer that nests the token, as Slack's does under `authed_user`.
const nested = (access: string, refresh: string): NestedAnswer => ({
  ok: true,
  authed_user: expiring(access, refresh),
});

// Signs in through the flow, so the token is kept as a sign-in keeps it, and registers the provider.
async function signedIn(
  provider: FakeProvider,
  options: OAuthFlowOptions = linear,
): Promise<FakeProvider> {
  const flow = oauthFlow(provider.argo, options);

  await flow.provide();
  await flow.start();
  provider.browser.resolve({ code: 'code-1', verifier: 'verifier-1' });
  await expect.poll(() => flow.state().kind).toBe('signed-in');

  return provider;
}

const keptSecret = (provider: FakeProvider): KeptToken =>
  KeptToken.parse(JSON.parse(provider.seen.secrets.get('account-1') ?? ''));

const refreshBodies = (provider: FakeProvider): Record<string, string>[] =>
  provider.seen.tokenBodies
    .map((body) => Object.fromEntries(new URLSearchParams(body)))
    .filter((fields) => fields.grant_type === 'refresh_token');

const afterOneHour = (): void => {
  vi.setSystemTime(signedInAt.getTime() + oneHour * 1000);
};

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

it('refreshes a token that has run out as a public client, with the client ID and refresh token alone', async () => {
  const provider = await signedIn(
    fakeProvider(
      answered(expiring('token-1', 'refresh-1')),
      answered(expiring('token-2', 'refresh-2')),
    ),
  );

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
  const provider = await signedIn(
    fakeProvider(
      answered(expiring('token-1', 'refresh-1')),
      answered(expiring('token-2', 'refresh-2')),
    ),
  );

  afterOneHour();
  await provider.borrow('account-1');

  expect(await provider.borrow('account-1')).toBe('token-2');
  expect(refreshBodies(provider)).toHaveLength(1);
});

it('lends a token that is still fresh without refreshing', async () => {
  const provider = await signedIn(
    fakeProvider(answered(expiring('token-1', 'refresh-1'))),
  );

  expect(await provider.borrow('account-1')).toBe('token-1');
  expect(refreshBodies(provider)).toEqual([]);
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

it('reads a client ID kept in Settings when it refreshes', async () => {
  const provider = await signedIn(
    fakeProvider(
      answered(expiring('token-1', 'refresh-1')),
      answered(expiring('token-2', 'refresh-2')),
    ),
    { ...linear, clientId: () => Promise.resolve('client-from-settings') },
  );

  afterOneHour();
  await provider.borrow('account-1');

  expect(refreshBodies(provider)[0]).toMatchObject({
    client_id: 'client-from-settings',
  });
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

it('keeps a token that never runs out as the bare string', async () => {
  const provider = await signedIn(fakeProvider());

  expect(provider.seen.secrets.get('account-1')).toBe('token-1');
});
