import type { Argo, TokenPaste } from '@argo/plugin-kit';
import { jiraApiUrl, siteApiUrl } from './atlassian';
import { jiraReaders, type JiraMyself } from './jira-readers';
import { jiraRequests } from './jira-requests';
import type { JiraSite } from './jira-store';
import { parseJson } from './json';
import { notices } from './sign-in-notices';

// What one token paste holds while the kit checks it, and the check the kit's `label` runs.
export type Calls = Pick<
  Argo,
  'fetch' | 'changed' | 'accounts' | 'secrets' | 'storage'
>;

// The site and email a credential is being checked for, and the paste it came from, while the kit checks it.
export type Checking = JiraSite & { email: string; paste: symbol };

export type Held = {
  notice: string | null;
  refusal: string | null;
  // The newest paste: only its check may say why it was not used.
  paste: symbol | null;
  checking: Map<string, Checking>;
};

export type Signing = { argo: Calls; flow: TokenPaste; held: Held };

type Check = { checking: Checking; credential: string };

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

  const notice = (await opensSite(argo, check))
    ? notices.unscoped
    : notices.refused;

  noteFor(held, check.checking.paste, notice);

  return null;
}

// An overtaken paste's reason is not the page's any more.
export function noteFor(held: Held, paste: symbol, notice: string): void {
  if (held.paste === paste) held.notice = notice;
}

/*
 * The kit's `label`: who the credential signs in as, from Jira's `myself`, or null with the reason held for the page.
 * It never keeps the credential.
 */
export function labelOf(
  signing: Signing,
  credential: string,
): Promise<string | null> {
  const checking = signing.held.checking.get(credential);

  return checking
    ? labelFor(signing, { checking, credential })
    : Promise.resolve(null);
}
