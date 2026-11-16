import type { Argo } from '@argo/plugin-kit';
import { atlassianHost, jiraApiUrl, siteHost } from './atlassian';
import { jiraReaders, type JiraMyself } from './jira-readers';
import { jiraRequests } from './jira-requests';
import { keepSite, type JiraSite } from './jira-store';
import { at, list, parseJson, present, text, type Json } from './json';

/*
 * Atlassian's OAuth 2.0 (3LO), for "Sign in with Atlassian" with an app the person registered at
 * developer.atlassian.com. Atlassian needs `audience` and `prompt` on every authorize URL, and the client secret on
 * every code exchange and refresh; `offline_access` gives the refresh token that keeps the person signed in.
 */
export const authorizeUrl = `https://auth.atlassian.com/authorize?audience=${atlassianHost}&prompt=consent`;

export const tokenUrl = 'https://auth.atlassian.com/oauth/token';

// The sites a token reaches, each with its cloud id, which an OAuth token opens.
const accessibleResourcesUrl = `https://${atlassianHost}/oauth/token/accessible-resources`;

// The scopes the API token asks for, and `offline_access` for the refresh token.
export const oauthScopes = [
  'read:jira-work',
  'read:jira-user',
  'write:jira-work',
  'offline_access',
] as const;

// The secret Settings the person fills in from their OAuth app; Argo ships no client ID or secret.
export const clientIdSetting = 'oauth-client-id';

export const clientSecretSetting = 'oauth-client-secret';

type Calls = Pick<Argo, 'fetch' | 'storage'>;

type Headers = { Accept: string; Authorization: string };

const bearer = (token: string): Headers => ({
  Accept: 'application/json',
  Authorization: `Bearer ${token}`,
});

const jiraScope = (scope: Json): boolean =>
  text(scope)?.includes(':jira-') === true;

const grantsJira = (resource: Json): boolean =>
  list(at(resource, 'scopes')).some(jiraScope);

const hostAt = (resource: Json): string | null =>
  siteHost(text(at(resource, 'url')) ?? '');

function siteAt(resource: Json): JiraSite | null {
  const cloudId = text(at(resource, 'id'));
  const host = hostAt(resource);

  return cloudId && host ? { cloudId, host } : null;
}

// A resource the token reaches is a Jira site when Atlassian granted it Jira scopes; a Confluence one is not.
const jiraSiteOf = (resource: Json): JiraSite | null =>
  grantsJira(resource) ? siteAt(resource) : null;

type Reply = Awaited<ReturnType<Argo['fetch']>>;

const bodyOf = (reply: Reply): Json | undefined =>
  reply?.ok ? parseJson(reply.body) : undefined;

async function sitesOf(argo: Calls, token: string): Promise<JiraSite[]> {
  const reply = await argo.fetch(accessibleResourcesUrl, {
    headers: bearer(token),
  });

  return list(bodyOf(reply)).map(jiraSiteOf).filter(present);
}

// Who the token signs in as, from Jira's `myself` on a site it reaches.
async function myselfOn(
  argo: Calls,
  { site, token }: { site: JiraSite; token: string },
): Promise<JiraMyself | null> {
  const url = jiraApiUrl(site.cloudId, jiraRequests.myself().path);
  const reply = await argo.fetch(url, { headers: bearer(token) });

  return jiraReaders.myself(bodyOf(reply));
}

// Who the token signs in as, on the first Jira site it reaches, and every Jira site it reaches.
async function whoIs(
  argo: Calls,
  token: string,
): Promise<{ myself: JiraMyself | null; sites: JiraSite[] }> {
  const sites = await sitesOf(argo, token);
  const [site] = sites;

  return { sites, myself: site ? await myselfOn(argo, { site, token }) : null };
}

// Only the email names the same Account the token sign-in does; a display name would add a second one.
const labelOf = (myself: JiraMyself | null): string | null =>
  myself?.email || null;

/*
 * The kit's `label` for an OAuth token: the email Jira's `myself` names, as the token sign-in labels its Account, so
 * both ways of signing in keep one Account. The sites the token reaches are kept for the site choice, as a token
 * sign-in keeps the one it was given. A token that reaches no Jira site, or whose `myself` cannot be read or hides
 * the email, signs in nobody.
 */
export async function oauthLabel(
  argo: Calls,
  token: string,
): Promise<string | null> {
  const { myself, sites } = await whoIs(argo, token);
  const label = labelOf(myself);

  if (label) for (const site of sites) await keepSite(argo, site);

  return label;
}
