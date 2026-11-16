import {
  oauthFlow,
  type Argo,
  type OAuthFlow,
  type OAuthFlowOptions,
} from '@argo/plugin-kit';
import { atlassianHost } from './atlassian';
import { clientId, clientSecret, oauthReady } from './atlassian-app';
import {
  authorizeUrl,
  oauthLabel,
  oauthScopes,
  tokenUrl,
} from './atlassian-oauth';
import type { AtlassianOffer } from './atlassian-sign-in-section';
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

type Lend = Parameters<Argo['accounts']['provide']>[2];

/*
 * The handler a flow's `provide()` would register, kept so one provider can answer for both ways of signing in, and
 * what to do each time the flow's state changes.
 */
type Held = { lend: Lend; onChange: () => void };

/*
 * Argo takes one provider for each host, with one header and prefix. A token sign-in keeps the whole `Basic …`
 * value; the OAuth flow keeps its own token, which is lent as `Bearer …`. So the OAuth flow's `provide()` hands its
 * handler here instead of registering it, and `provideAtlassian` registers one that answers either.
 */
function capturing(argo: Calls, held: Held): Calls {
  return {
    ...argo,
    changed: () => {
      held.onChange();
      argo.changed();
    },
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

// The token is lent whole, `Bearer` included, since the one provider also lends a token sign-in's `Basic` value.
const whole = { header: 'Authorization', prefix: '' };

const options = (argo: Calls): OAuthFlowOptions => ({
  host: atlassianHost,
  authorizeUrl,
  tokenUrl,
  clientId: () => clientId(argo),
  clientSecret: () => clientSecret(argo),
  scopes: oauthScopes,
  header: whole,
  label: (token) => oauthLabel(argo, token),
});

/*
 * Signing in with Atlassian replaces whatever the token paste last said: its token was overwritten on the one
 * Account, and a refusal a read noted before belongs to the token gone.
 */
function replacesPaste(flow: OAuthFlow, paste: JiraSignIn): void {
  if (flow.state().kind !== 'signed-in') return;

  paste.refused(null);
  paste.flow.cancel();
}

export function atlassianSignIn(
  argo: Calls,
  paste: JiraSignIn,
): AtlassianSignIn {
  const held: Held = { lend: () => null, onChange: () => {} };

  const flow = oauthFlow(capturing(argo, held), options(argo));

  held.onChange = (): void => replacesPaste(flow, paste);

  return Object.freeze({
    flow,
    provide: async () => {
      await flow.provide();
      await provideAtlassian(argo, { held, flow });
    },
  });
}

type Lending = { argo: Calls; held: Held; flow: OAuthFlow };

type Account = Parameters<Lend>[0];

// The OAuth token, refreshed by the flow when it has run out; a refresh Atlassian refused lends nothing.
async function oauthToken(
  { held, flow }: Lending,
  account: Account,
): Promise<string | null> {
  const token = await held.lend(account);

  if (token) return `Bearer ${token}`;

  // The sign-in page stops saying the person is signed in, so it offers the sign-in again.
  if (flow.state().kind === 'signed-in') flow.cancel();

  return null;
}

const pasted = (kept: string): boolean => kept.startsWith('Basic ');

/*
 * One provider for the `api.atlassian.com` Account, however the person signed in: a token sign-in's Secret is the
 * `Authorization` value itself, and anything else is the OAuth flow's.
 */
async function lent(
  lending: Lending,
  account: Account,
): Promise<string | null> {
  const kept = await lending.argo.secrets.get(account.id);

  if (kept === null || pasted(kept)) return kept;

  return oauthToken(lending, account);
}

const provideAtlassian = (
  argo: Calls,
  { held, flow }: Omit<Lending, 'argo'>,
): Promise<void> =>
  argo.accounts.provide(atlassianHost, whole, (account) =>
    lent({ argo, held, flow }, account),
  );

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

/*
 * "Sign in with Atlassian" needs the person's OAuth app, and the Server Device's browser and callback port, so a
 * paired Device is told to continue there.
 */
export async function atlassianOffer(
  argo: Pick<Argo, 'settings'>,
  { atlassian }: SignIns,
  serverDevice: boolean,
): Promise<AtlassianOffer> {
  if (!(await oauthReady(argo))) return { kind: 'needs-app' };

  return serverDevice
    ? { kind: 'here', state: atlassian.flow.state() }
    : { kind: 'elsewhere' };
}

/*
 * Who the sign-in page says is signed in: the token paste's, which already holds back a sign-in a read found refused,
 * else Atlassian's under the same guard, since both lend the one Account. A paste after an OAuth sign-in names
 * the token's person; an OAuth sign-in resets the paste.
 */
function atlassianLabel({ paste, atlassian }: SignIns): string | null {
  const oauth = atlassian.flow.state();

  if (oauth.kind !== 'signed-in') return null;

  return paste.refusal() === null ? oauth.label : null;
}

export const whoIsSignedIn = (signIns: SignIns): string | null =>
  signIns.paste.signedIn() ?? atlassianLabel(signIns);

// The token sign-in and "Sign in with Atlassian", which keep one Account between them.
export type SignIns = Readonly<{
  paste: JiraSignIn;
  atlassian: AtlassianSignIn;
}>;
