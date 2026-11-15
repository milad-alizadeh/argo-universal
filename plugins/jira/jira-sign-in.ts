import {
  tokenPaste,
  type Argo,
  type TokenPaste,
  type TokenPasteState,
} from '@argo/plugin-kit';
import {
  atlassianHost,
  basicCredential,
  jiraApiUrl,
  siteApiUrl,
  siteHost,
} from './atlassian';
import { jiraReaders, jiraRequests } from './jira-client';
import { siteOf } from './jira-sites';
import { keepSite, type JiraSite } from './jira-store';
import { parseJson } from './json';
import { notices } from './sign-in-notices';

/*
 * Jira's sign-in by a pasted scoped API token. A scoped token opens `api.atlassian.com` as Basic over the person's
 * email and the token, and Jira there needs the site's cloud id, so the page asks for the email and the site too.
 * The kit's token paste keeps the credential as the Account's Secret and lends it whole: the provider's prefix is
 * empty and the Secret is the `Authorization` value, so another way to sign in can keep a Bearer token on the same
 * Account.
 */
export type SignInInput = { email: string; site: string; token: string };

export type JiraSignIn = Readonly<{
  flow: TokenPaste;
  // Why the last paste was not used, in Jira's terms, drawn beside the field over the kit's own message.
  notice: () => string | null;
  paste: (input: SignInInput) => Promise<TokenPasteState>;
}>;

type Calls = Pick<
  Argo,
  'fetch' | 'changed' | 'accounts' | 'secrets' | 'storage'
>;

// The site and email a credential is being checked for, while the kit checks it.
type Checking = JiraSite & { email: string };

type Held = { notice: string | null; checking: Map<string, Checking> };

const emailShape = /^[^\s@]+@[^\s@]+$/;

const shortestToken = 8;

const headersFor = (credential: string) => ({
  Accept: 'application/json',
  Authorization: credential,
});

// An unscoped token opens the site itself but not `api.atlassian.com`; telling them apart lets the page say why.
async function opensSite(
  argo: Calls,
  checking: Checking,
  credential: string,
): Promise<boolean> {
  const reply = await argo.fetch(
    siteApiUrl(checking.host, jiraRequests.myself().path),
    { headers: headersFor(credential) },
  );

  return reply?.ok === true;
}

/*
 * The kit's `label`: who the credential signs in as, from Jira's `myself`, or null with the reason held for the page.
 * It never keeps the credential.
 */
async function labelOf(
  argo: Calls,
  held: Held,
  credential: string,
): Promise<string | null> {
  const checking = held.checking.get(credential);

  if (!checking) return null;

  const url = jiraApiUrl(checking.cloudId, jiraRequests.myself().path);
  const reply = await argo.fetch(url, { headers: headersFor(credential) });
  const myself = reply?.ok ? jiraReaders.myself(parseJson(reply.body)) : null;

  if (myself) return myself.email || checking.email;

  held.notice = (await opensSite(argo, checking, credential))
    ? notices.unscoped
    : notices.refused;

  return null;
}

const failed = (message: string): TokenPasteState => ({
  kind: 'failed',
  reason: 'rejected',
  message,
});

// What the page asks for besides the token, checked before Atlassian is asked anything.
function missing({ email, site }: SignInInput): string | null {
  if (!emailShape.test(email.trim())) return notices.email;

  return siteHost(site) ? null : notices.site;
}

async function pasted(
  argo: Calls,
  { flow, held }: { flow: TokenPaste; held: Held },
  input: SignInInput,
): Promise<TokenPasteState> {
  held.notice = null;

  if (input.token.trim().length < shortestToken) return flow.start(input.token);

  held.notice = missing(input);

  const host = siteHost(input.site);
  const site = host && !held.notice ? await siteOf(argo, host) : null;

  if (host && !held.notice && !site) held.notice = notices.noSite(host);

  if (!site || held.notice) {
    argo.changed();

    return failed(held.notice ?? notices.site);
  }

  return checked(
    argo,
    { flow, held },
    { ...site, email: input.email, token: input.token },
  );
}

async function checked(
  argo: Calls,
  { flow, held }: { flow: TokenPaste; held: Held },
  { token, ...checking }: Checking & { token: string },
): Promise<TokenPasteState> {
  const credential = basicCredential(checking.email, token);

  held.checking.set(credential, checking);

  try {
    const state = await flow.start(credential);

    if (state.kind === 'signed-in') await keepSite(argo, checking);

    return state;
  } finally {
    held.checking.delete(credential);
  }
}

export function jiraSignIn(argo: Calls): JiraSignIn {
  const held: Held = { notice: null, checking: new Map() };

  const flow = tokenPaste(argo, {
    host: atlassianHost,
    header: { header: 'Authorization', prefix: '' },
    label: (credential) => labelOf(argo, held, credential),
  });

  return Object.freeze({
    flow,
    notice: () => held.notice,
    paste: (input: SignInInput) => pasted(argo, { flow, held }, input),
  });
}
