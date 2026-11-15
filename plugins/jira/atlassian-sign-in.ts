import { oauthFlow, type Argo, type OAuthFlow } from '@argo/plugin-kit';
import { atlassianHost } from './atlassian';
import {
  authorizeUrl,
  clientIdSetting,
  clientSecretSetting,
  oauthLabel,
  oauthScopes,
  tokenUrl,
} from './atlassian-oauth';
import type { JiraSignIn } from './jira-sign-in';

/*
 * "Sign in with Atlassian": the kit's OAuth flow with the client ID and secret from the Plugin's secret Settings. It
 * adds, or rewrites the token of, the same `api.atlassian.com` Account the token sign-in uses, since both label it
 * with the person's email.
 */
type Calls = Pick<
  Argo,
  | 'oauth'
  | 'accounts'
  | 'secrets'
  | 'fetch'
  | 'changed'
  | 'settings'
  | 'storage'
>;

async function setting(argo: Pick<Argo, 'settings'>, key: string) {
  const value = await argo.settings.get(key);

  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export const clientId = (argo: Pick<Argo, 'settings'>) =>
  setting(argo, clientIdSetting);

const clientSecret = (argo: Pick<Argo, 'settings'>) =>
  setting(argo, clientSecretSetting);

// Whether the person set both halves of their OAuth app, so the sign-in page offers the button.
export async function oauthReady(
  argo: Pick<Argo, 'settings'>,
): Promise<boolean> {
  const [id, secret] = await Promise.all([clientId(argo), clientSecret(argo)]);

  return id !== null && secret !== null;
}

type Lend = Parameters<Argo['accounts']['provide']>[2];

// The handler a flow's `provide()` would register, kept so one provider can answer for both ways of signing in.
type Held = { lend: Lend | null };

/*
 * Argo takes one provider for each host, with one header and prefix. A token sign-in keeps the whole `Basic …`
 * value; the OAuth flow keeps its own token, which is lent as `Bearer …`. So the OAuth flow's `provide()` hands its
 * handler here instead of registering it, and `provideAtlassian` registers one that answers either.
 */
function capturing(argo: Calls, held: Held): Calls {
  return {
    ...argo,
    accounts: {
      ...argo.accounts,
      provide: async (_host, _header, handler) => {
        held.lend = handler;
      },
    },
  };
}

export type AtlassianSignIn = Readonly<{
  flow: OAuthFlow;
  provide: () => Promise<void>;
}>;

export function atlassianSignIn(argo: Calls): AtlassianSignIn {
  const held: Held = { lend: null };
  const flow = oauthFlow(capturing(argo, held), {
    host: atlassianHost,
    authorizeUrl,
    tokenUrl,
    clientId: () => clientId(argo),
    clientSecret: () => clientSecret(argo),
    scopes: oauthScopes,
    header: { header: 'Authorization', prefix: '' },
    label: (token) => oauthLabel(argo, token),
  });

  return Object.freeze({
    flow,
    provide: async () => {
      await flow.provide();
      await provideAtlassian(argo, { held, flow });
    },
  });
}

const basic = 'Basic ';

/*
 * One provider for the `api.atlassian.com` Account, however the person signed in: a token sign-in's Secret is the
 * `Authorization` value itself, and anything else is the OAuth flow's, refreshed by it when it has run out. A refresh
 * Atlassian refuses lends nothing, and the sign-in page stops saying the person is signed in, so it offers the sign-in
 * again.
 */
function provideAtlassian(
  argo: Calls,
  { held, flow }: { held: Held; flow: OAuthFlow },
): Promise<void> {
  return argo.accounts.provide(
    atlassianHost,
    { header: 'Authorization', prefix: '' },
    async (account) => {
      const kept = await argo.secrets.get(account.id);

      if (kept === null || kept.startsWith(basic)) return kept;

      const token = await held.lend?.(account);

      if (token) return `Bearer ${token}`;

      if (flow.state().kind === 'signed-in') flow.cancel();

      return null;
    },
  );
}

/*
 * The page's "Sign in with Atlassian" and Cancel. A sign-in answers once the browser is open; the page draws the wait.
 * Started from another Device, Argo refuses the redirect, and the page says so.
 */
export function registerAtlassianOperations(
  argo: Pick<Argo, 'operations'>,
  { flow }: AtlassianSignIn,
): void {
  argo.operations.register('signInWithAtlassian', async () => ({
    state: (await flow.start()).kind,
  }));
  argo.operations.register('cancelSignInWithAtlassian', () => ({
    state: flow.cancel().kind,
  }));
}

// The token sign-in and "Sign in with Atlassian", which keep one Account between them.
export type SignIns = Readonly<{
  paste: JiraSignIn;
  atlassian: AtlassianSignIn;
}>;
