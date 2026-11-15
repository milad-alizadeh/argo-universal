import type { Argo } from './argo-api';

// What a token paste calls: the Account it adds, the token it keeps, and the page it redraws.
export type TokenPasteArgo = Pick<Argo, 'changed'> & {
  accounts: Pick<Argo['accounts'], 'add' | 'provide'>;
  secrets: Pick<Argo['secrets'], 'set' | 'get'>;
};

/*
 * One service's token-paste sign-in, as `tokenPaste(argo, options)` takes it: the person pastes an API token they
 * made at the service, such as a Jira or Linear personal token, and the kit checks it and keeps it.
 *
 * - `host` is the Account's API host, which the Plugin declares in `contributes.accounts` and as a `fetch`
 *   Capability.
 * - `header` is how a borrower's request carries the token, such as `{ header: 'Authorization', prefix: 'Bearer' }`.
 * - `label` checks a pasted token: it calls the service with it and answers whose Account it opens, such as the
 *   login the service answers, or null when the service refuses it.
 */
export type TokenPasteOptions = Readonly<{
  host: string;
  header: Readonly<{ header: string; prefix: string }>;
  label: (token: string) => Promise<string | null>;
}>;

/*
 * Where the Plugin's one token paste stands: waiting for a token, signed in as the Account just added, or `failed`
 * with why the last token pasted was not kept, drawn beside the field.
 */
export type TokenPasteState =
  | { kind: 'idle' }
  | { kind: 'signed-in'; label: string }
  | { kind: 'failed'; reason: 'rejected'; message: string };

/*
 * A Plugin's token-paste sign-in for one service. It lives in the Plugin's module, so every page and every App sees
 * one sign-in, and each change of `state()` calls `argo.changed()`. A token is pasted on any Device.
 *
 * - `start(token)` checks the token, without its surrounding spaces, with `label`; an accepted one adds the Account,
 *   or finds the one already signed in with that label, and keeps the token as its Secret. It answers the state
 *   then. Text shorter than 8 characters is no token: it is not checked, and leaves the paste `idle`. A token pasted
 *   while an earlier one is being checked or kept replaces it, and the earlier one keeps nothing.
 * - `cancel()` forgets a failed paste and answers `idle`.
 * - `provide()` registers the Account's provider, which hands a borrower's request the kept token.
 */
export type TokenPaste = Readonly<{
  serverDevice: false;
  pastesToken: true;
  state: () => TokenPasteState;
  start: (token: string) => Promise<TokenPasteState>;
  cancel: () => TokenPasteState;
  provide: () => Promise<void>;
}>;

export type TokenPastePattern = (
  argo: TokenPasteArgo,
  options: TokenPasteOptions,
) => TokenPaste;
