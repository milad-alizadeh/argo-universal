import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import { arenaSite, person, type FixtureToken } from './jira-data';

/*
 * Atlassian's OAuth 2.0 (3LO) as the Plugin meets it, for its tests: the token endpoint at auth.atlassian.com, which
 * wants the app's client secret on every exchange and refresh and rotates the refresh token each time, and
 * `accessible-resources`, which lists the sites a token reaches. Each access token it issues opens Jira through
 * Atlassian's gateway as the person, as a scoped API token does.
 */
export const oauthClient = {
  id: 'fixture-client-id-5d1e',
  secret: 'fixture-client-secret-9b3f',
};

export const oauthSettings = new Map([
  ['oauth-client-id', oauthClient.id],
  ['oauth-client-secret', oauthClient.secret],
]);

// The code the fixture browser brings back, as Atlassian would after the person allows the app.
export const grantedCode = 'fixture-code';

// Access tokens last an hour, as Atlassian's do.
export const tokenLifetimeMs = 3_600_000;

const tokenLifetimeSeconds = tokenLifetimeMs / 1000;

type Resource = { id: string; url: string; name: string; scopes: string[] };

const jiraScopes = ['read:jira-work', 'read:jira-user', 'write:jira-work'];

// The arena site with Jira granted, and a Confluence site the same grant reaches, which is no Jira site.
const resources: Resource[] = [
  {
    id: arenaSite.cloudId,
    url: `https://${arenaSite.host}`,
    name: 'arena',
    scopes: jiraScopes,
  },
  {
    id: 'cloud-wiki',
    url: 'https://wiki.atlassian.net',
    name: 'wiki',
    scopes: ['read:confluence-content.all'],
  },
];

export type AtlassianOAuth = {
  // Answers a request it serves, or nothing for one the Jira fixture serves.
  answer: (request: FixtureRequest) => FixtureAnswer | null;
  // Whose access token a Bearer request carries.
  who: (token: string) => FixtureToken | undefined;
  // The token endpoint's request bodies: exchanges and refreshes.
  forms: () => URLSearchParams[];
  refreshes: () => URLSearchParams[];
  // Expires or revokes the refresh token, as 90 days unused or a revoked grant does.
  revoke: () => void;
};

type Held = {
  generation: number;
  refresh: string | null;
  access: string | null;
  forms: URLSearchParams[];
};

const refused = (status: number, error: string, description: string) => ({
  status,
  json: { error, error_description: description },
});

// A new pair each time; the refresh token spent is spent for good.
function issued(held: Held): FixtureAnswer {
  held.generation += 1;
  held.access = `atlassian-access-${held.generation}`;
  held.refresh = `atlassian-refresh-${held.generation}`;

  return {
    json: {
      access_token: held.access,
      refresh_token: held.refresh,
      expires_in: tokenLifetimeSeconds,
      scope: [...jiraScopes, 'offline_access'].join(' '),
      token_type: 'Bearer',
    },
  };
}

function tokenAnswer(held: Held, form: URLSearchParams): FixtureAnswer {
  if (
    form.get('client_id') !== oauthClient.id ||
    form.get('client_secret') !== oauthClient.secret
  )
    return refused(401, 'access_denied', 'Unauthorized');

  const grant = form.get('grant_type');

  if (grant === 'authorization_code')
    return form.get('code') === grantedCode
      ? issued(held)
      : refused(403, 'invalid_grant', 'Invalid authorization code');

  if (grant === 'refresh_token' && form.get('refresh_token') === held.refresh)
    return issued(held);

  return refused(403, 'unauthorized_client', 'refresh_token is invalid');
}

export function atlassianOAuth(): AtlassianOAuth {
  const held: Held = { generation: 0, refresh: null, access: null, forms: [] };
  const who = (token: string): FixtureToken | undefined =>
    token !== '' && token === held.access
      ? { ...person, token, scoped: true }
      : undefined;

  return {
    who,
    answer: (request) => {
      if (
        request.host === 'auth.atlassian.com' &&
        request.path === '/oauth/token'
      ) {
        const form = new URLSearchParams(request.body);

        held.forms.push(form);

        return tokenAnswer(held, form);
      }

      if (request.path !== '/oauth/token/accessible-resources') return null;

      const bearer = String(request.headers.authorization).replace(
        /^Bearer /,
        '',
      );

      return who(bearer)
        ? { json: resources }
        : refused(401, 'unauthorized', 'Unauthorized');
    },
    forms: () => held.forms,
    refreshes: () =>
      held.forms.filter((form) => form.get('grant_type') === 'refresh_token'),
    revoke: () => {
      held.refresh = null;
    },
  };
}
