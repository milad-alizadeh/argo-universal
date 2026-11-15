import type { Argo } from '@argo/plugin-kit';
import { atlassianHost, jiraApiUrl, siteHost } from './atlassian';
import { jiraReaders, jiraRequests } from './jira-client';
import { keepSite, type JiraSite } from './jira-store';
import { at, list, parseJson, text } from './json';

/*
 * Atlassian's OAuth 2.0 (3LO), for "Sign in with Atlassian" with an app the person registered at
 * developer.atlassian.com. Atlassian needs `audience` and `prompt` on every authorize URL, and the client secret on
 * every code exchange and refresh; `offline_access` gives the refresh token that keeps the person signed in.
 */
export const authorizeUrl = `https://auth.atlassian.com/authorize?audience=${atlassianHost}&prompt=consent`;

export const tokenUrl = 'https://auth.atlassian.com/oauth/token';

// The sites a token reaches, each with its cloud id; an OAuth token opens it, a scoped API token need not.
export const accessibleResourcesUrl = `https://${atlassianHost}/oauth/token/accessible-resources`;

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

const bearer = (token: string) => ({
  Accept: 'application/json',
  Authorization: `Bearer ${token}`,
});

// A resource the token reaches is a Jira site when Atlassian granted it Jira scopes; a Confluence one is not.
function jiraSiteOf(resource: unknown): JiraSite | null {
  const cloudId = text(at(resource, 'id'));
  const host = siteHost(text(at(resource, 'url')) ?? '');
  const scopes = list(at(resource, 'scopes'));
  const jira = scopes.some((scope) => String(scope).includes(':jira-'));

  return cloudId && host && jira ? { cloudId, host } : null;
}

async function sitesOf(argo: Calls, token: string): Promise<JiraSite[]> {
  const reply = await argo.fetch(accessibleResourcesUrl, {
    headers: bearer(token),
  });

  if (!reply?.ok) return [];

  return list(parseJson(reply.body))
    .map(jiraSiteOf)
    .filter((site) => site !== null);
}

/*
 * The kit's `label` for an OAuth token: the email Jira's `myself` names, as the token sign-in labels its Account, so
 * both ways of signing in keep one Account. The sites the token reaches are kept for the site choice, as a token
 * sign-in keeps the one it was given. A token that reaches no Jira site, or whose `myself` cannot be read, signs in
 * nobody.
 */
export async function oauthLabel(
  argo: Calls,
  token: string,
): Promise<string | null> {
  const sites = await sitesOf(argo, token);
  const [first] = sites;

  if (!first) return null;

  const reply = await argo.fetch(
    jiraApiUrl(first.cloudId, jiraRequests.myself().path),
    { headers: bearer(token) },
  );
  const myself = reply?.ok ? jiraReaders.myself(parseJson(reply.body)) : null;

  if (!myself) return null;

  for (const site of sites) await keepSite(argo, site);

  return myself.email || myself.name;
}
