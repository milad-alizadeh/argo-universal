import type { Argo } from './argo-api';

// What an OAuth flow calls: Argo's redirect, the Account it adds, the token it keeps, and the page it redraws.
export type OAuthFlowArgo = Pick<
  Argo,
  'oauth' | 'accounts' | 'secrets' | 'fetch' | 'changed'
>;

// A value the flow reads when a sign-in starts, such as a client ID kept in the Plugin's settings.
type Given<Value> = Value | (() => Value | null | Promise<Value | null>);

/*
 * One service's OAuth sign-in, as `oauthFlow(argo, options)` takes it. `host` is the Account's API host,
 * which the Plugin declares in `contributes.accounts` and as a `fetch` Capability; `authorizeUrl` and
 * `tokenUrl` are the service's, and `tokenUrl`'s host needs a `fetch` Capability too.
 *
 * - `clientId` is the OAuth app's public client ID, or a function that reads it when a sign-in starts.
 * - `scopes` go in the authorize URL's `scope`, joined by spaces.
 * - `label` names whose Account the token opens, such as the login the service answers for it; null fails
 *   the sign-in.
 * - `tokenPath` is where the access token sits in the token endpoint's JSON answer, `['access_token']`
 *   by default. A service that nests it, such as Slack's `['authed_user', 'access_token']`, says where.
 * - `header` is how a borrower's request carries the token, `Authorization: Bearer` by default.
 */
export type OAuthFlowOptions = Readonly<{
  host: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientId: Given<string>;
  scopes?: readonly string[];
  label: (token: string) => Promise<string | null>;
  tokenPath?: readonly string[];
  header?: Readonly<{ header: string; prefix: string }>;
}>;

/*
 * Where the Plugin's one sign-in stands. `waiting` is waiting for the person in the browser; `signed-in`
 * names the Account just added; `failed` says why, and `port-in-use` that another program holds Argo's
 * callback port. A cancelled, denied or timed-out sign-in is `idle` again.
 */
export type OAuthFlowState =
  | { kind: 'idle' }
  | { kind: 'waiting' }
  | { kind: 'signed-in'; label: string }
  | { kind: 'failed'; reason: 'port-in-use' | 'failed'; message: string };

/*
 * A Plugin's OAuth sign-in for one service. The Plugin keeps it in its module, so every page and every App
 * sees one sign-in; each change of `state()` calls `argo.changed()`, so the pages that draw it redraw.
 *
 * - `start()` starts a sign-in and answers once the browser is opened, with the state then, normally
 *   `waiting`; the flow then waits up to five minutes, exchanges the code for a token, adds the Account and
 *   keeps the token under the Account's id. Starting again replaces a sign-in still waiting. Call it from
 *   an Operation the page runs, on the Server Device.
 * - `cancel()` stops waiting and answers `idle`. The browser tab stays open; a callback from it is ignored.
 * - `provide()` registers the Account's provider, which hands a borrower's request the kept token. Call it
 *   once as the Plugin registers. A token whose answer carried `refresh_token` and `expires_in`, beside the
 *   access token at `tokenPath`, is refreshed at `tokenUrl` with the client ID alone when a borrow finds it run
 *   out, so the person stays signed in.
 */
export type OAuthFlow = Readonly<{
  // The browser and Argo's callback port are the Server Device's, so only it starts this sign-in.
  serverDevice: true;
  state: () => OAuthFlowState;
  start: () => Promise<OAuthFlowState>;
  cancel: () => OAuthFlowState;
  provide: () => Promise<void>;
}>;

export type OAuthFlowPattern = (
  argo: OAuthFlowArgo,
  options: OAuthFlowOptions,
) => OAuthFlow;
