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
import { jiraReaders, type JiraMyself } from './jira-readers';
import { jiraRequests } from './jira-requests';
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

type Signing = { argo: Calls; flow: TokenPaste; held: Held };

type Check = { checking: Checking; credential: string };

const emailPattern = /^[^\s@]+@[^\s@]+$/;

const shortestToken = 8;

type CheckHeaders = { Accept: string; Authorization: string };

const headersFor = (credential: string): CheckHeaders => ({
  Accept: 'application/json',
  Authorization: credential,
});

async function myselfWith(
  argo: Calls,
  { checking, credential }: Check,
): Promise<JiraMyself | null> {
  const url = jiraApiUrl(checking.cloudId, jiraRequests.myself().path);
  const reply = await argo.fetch(url, { headers: headersFor(credential) });

  return reply?.ok ? jiraReaders.myself(parseJson(reply.body)) : null;
}

// An unscoped token opens the site itself but not `api.atlassian.com`; telling them apart lets the page say why.
async function opensSite(
  argo: Calls,
  { checking, credential }: Check,
): Promise<boolean> {
  const url = siteApiUrl(checking.host, jiraRequests.myself().path);
  const reply = await argo.fetch(url, { headers: headersFor(credential) });

  return reply?.ok === true;
}

const labelOfMyself = (myself: JiraMyself, email: string): string =>
  myself.email || email;

async function labelFor(
  { argo, held }: Signing,
  check: Check,
): Promise<string | null> {
  const myself = await myselfWith(argo, check);

  if (myself) return labelOfMyself(myself, check.checking.email);

  held.notice = (await opensSite(argo, check))
    ? notices.unscoped
    : notices.refused;

  return null;
}

/*
 * The kit's `label`: who the credential signs in as, from Jira's `myself`, or null with the reason held for the page.
 * It never keeps the credential.
 */
function labelOf(signing: Signing, credential: string): Promise<string | null> {
  const checking = signing.held.checking.get(credential);

  return checking
    ? labelFor(signing, { checking, credential })
    : Promise.resolve(null);
}

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

function refuse({ argo, held }: Signing, notice: string): TokenPasteState {
  held.notice = notice;
  argo.changed();

  return { kind: 'failed', reason: 'rejected', message: notice };
}

async function checked(
  signing: Signing,
  { token, ...checking }: Checking & { token: string },
): Promise<TokenPasteState> {
  const credential = basicCredential(checking.email, token);

  signing.held.checking.set(credential, checking);

  try {
    const state = await signing.flow.start(credential);

    if (state.kind === 'signed-in') await keepSite(signing.argo, checking);

    return state;
  } finally {
    signing.held.checking.delete(credential);
  }
}

async function pasted(
  signing: Signing,
  input: SignInInput,
): Promise<TokenPasteState> {
  signing.held.notice = null;

  // Text too short for a token leaves the paste idle, as the kit does, before any site is looked up.
  if (input.token.trim().length < shortestToken)
    return signing.flow.start(input.token);

  const site = await siteFor(signing.argo, input);

  return typeof site === 'string'
    ? refuse(signing, site)
    : checked(signing, { ...site, email: input.email, token: input.token });
}

export function jiraSignIn(argo: Calls): JiraSignIn {
  const held: Held = { notice: null, checking: new Map() };

  const flow = tokenPaste(argo, {
    host: atlassianHost,
    header: { header: 'Authorization', prefix: '' },
    label: (credential) => labelOf({ argo, held, flow }, credential),
  });

  return Object.freeze({
    flow,
    notice: () => held.notice,
    paste: (input: SignInInput) => pasted({ argo, held, flow }, input),
  });
}
