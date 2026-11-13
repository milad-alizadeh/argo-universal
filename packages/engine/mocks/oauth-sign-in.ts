import type { OAuthFlowOptions } from '@repo/contracts/plugins/oauth-flow-api';
import { expect, vi } from 'vitest';
import { KeptToken } from '../src/plugins/kit/kept-token';
import { oauthFlow } from '../src/plugins/kit/oauth-flow';
import { linear, tokenReply, type FakeProvider } from './oauth-provider';

export const signedInAt = new Date('2026-11-13T07:10:00Z');

export const oneHour = 60 * 60;

type ExpiringAnswer = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type NestedAnswer = { ok: boolean; authed_user: ExpiringAnswer };

export const answered = (
  body: ExpiringAnswer | NestedAnswer,
): ReturnType<typeof tokenReply> => tokenReply(true, JSON.stringify(body));

export const expiring = (access: string, refresh: string): ExpiringAnswer => ({
  access_token: access,
  refresh_token: refresh,
  expires_in: oneHour,
});

// An answer that nests the token, as Slack's does under `authed_user`.
export const nested = (access: string, refresh: string): NestedAnswer => ({
  ok: true,
  authed_user: expiring(access, refresh),
});

// Signs in through the flow, so the token is kept as a sign-in keeps it, and registers the provider.
export async function signedIn(
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

export const keptSecret = (provider: FakeProvider): KeptToken =>
  KeptToken.parse(JSON.parse(provider.seen.secrets.get('account-1') ?? ''));

export const refreshBodies = (
  provider: FakeProvider,
): Record<string, string>[] =>
  provider.seen.tokenBodies
    .map((body) => Object.fromEntries(new URLSearchParams(body)))
    .filter((fields) => fields.grant_type === 'refresh_token');

// Only the clock is faked: the flow's own waits still run.
export const useSignInClock = (): void => {
  vi.useFakeTimers({ now: signedInAt, toFake: ['Date'] });
};

export const afterOneHour = (): void => {
  vi.setSystemTime(signedInAt.getTime() + oneHour * 1000);
};
