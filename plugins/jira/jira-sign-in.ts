import {
  tokenPaste,
  type TokenPaste,
  type TokenPasteState,
} from '@argo/plugin-kit';
import { atlassianHost, basicCredential, siteHost } from './atlassian';
import { siteOf } from './jira-sites';
import { keepSite, type JiraSite } from './jira-store';
import { notices } from './sign-in-notices';
import {
  labelOf,
  noteFor,
  type Calls,
  type Checking,
  type Held,
  type Signing,
} from './token-check';

/*
 * Jira's sign-in by a pasted scoped API token. A scoped token opens `api.atlassian.com` as Basic over the person's
 * email and the token, and Jira there needs the site's cloud id, so the page asks for the email and the site too.
 * The kit's token paste keeps the credential as the Account's Secret and lends it whole: the provider's prefix is
 * empty and the Secret is the `Authorization` value, so another way to sign in can keep a Bearer token on the same
 * Account.
 */
type SignInInput = { email: string; site: string; token: string };

export type JiraSignIn = Readonly<{
  flow: TokenPaste;
  // Why the last paste was not used, in Jira's terms, drawn beside the field over the kit's own message.
  notice: () => string | null;
  paste: (input: SignInInput) => Promise<TokenPasteState>;
  /*
   * Who is signed in, or null once a read found the Account gone or its token refused: the kit's paste stays
   * `signed-in` for the life of the Plugin, so the sign-in page takes a new token after a revoke, as `signInGate` does.
   */
  signedIn: () => string | null;
  // Why the page needs a new token: a read found no Account, or Jira refused its token. A read that succeeds clears it.
  refusal: () => string | null;
  refused: (message: string | null) => void;
}>;

const emailPattern = /^[^\s@]+@[^\s@]+$/;

const shortestToken = 8;

const foundSite = async (
  argo: Calls,
  host: string,
): Promise<JiraSite | string> =>
  (await siteOf(argo, host)) ?? notices.noSite(host);

// The site the paste is for, or why the page cannot ask Atlassian yet.
async function siteFor(
  argo: Calls,
  { email, site }: SignInInput,
): Promise<JiraSite | string> {
  if (!emailPattern.test(email.trim())) return notices.email;

  const host = siteHost(site);

  return host ? foundSite(argo, host) : notices.site;
}

function refuse(
  { argo, held }: Signing,
  { paste, notice }: { paste: symbol; notice: string },
): TokenPasteState {
  noteFor(held, paste, notice);
  argo.changed();

  return { kind: 'failed', reason: 'rejected', message: notice };
}

async function kept(signing: Signing, site: JiraSite): Promise<void> {
  signing.held.refusal = null;
  await keepSite(signing.argo, { cloudId: site.cloudId, host: site.host });
}

async function checked(
  signing: Signing,
  { token, ...checking }: Checking & { token: string },
): Promise<TokenPasteState> {
  const credential = basicCredential(checking.email, token);

  signing.held.checking.set(credential, checking);

  try {
    const state = await signing.flow.start(credential);

    if (state.kind === 'signed-in') await kept(signing, checking);

    return state;
  } finally {
    signing.held.checking.delete(credential);
  }
}

async function pasted(
  signing: Signing,
  input: SignInInput,
): Promise<TokenPasteState> {
  const paste = Symbol('paste');

  signing.held.notice = null;
  signing.held.paste = paste;

  // Text too short for a token leaves the paste idle, as the kit does, before any site is looked up.
  if (input.token.trim().length < shortestToken)
    return signing.flow.start(input.token);

  const site = await siteFor(signing.argo, input);
  const { email, token } = input;

  return typeof site === 'string'
    ? refuse(signing, { paste, notice: site })
    : checked(signing, { ...site, email, token, paste });
}

function noteRefusal(held: Held, message: string | null): void {
  held.refusal = message;
}

function signedInLabel(flow: TokenPaste, held: Held): string | null {
  const state = flow.state();

  return state.kind === 'signed-in' && !held.refusal ? state.label : null;
}

const emptyHeld = (): Held => ({
  notice: null,
  refusal: null,
  paste: null,
  checking: new Map(),
});

const signInOf = ({ argo, held, flow }: Signing): JiraSignIn =>
  Object.freeze({
    flow,
    notice: () => held.notice,
    paste: (input: SignInInput) => pasted({ argo, held, flow }, input),
    signedIn: () => signedInLabel(flow, held),
    refusal: () => held.refusal,
    refused: (message: string | null) => noteRefusal(held, message),
  });

export function jiraSignIn(argo: Calls): JiraSignIn {
  const held = emptyHeld();

  const flow = tokenPaste(argo, {
    host: atlassianHost,
    header: { header: 'Authorization', prefix: '' },
    label: (credential) => labelOf({ argo, held, flow }, credential),
  });

  return signInOf({ argo, held, flow });
}
