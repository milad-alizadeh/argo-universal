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
  // Revokes the app's grant: the access token, though not yet run out, opens nothing, and Jira answers 401.
  revokeApp: () => void;
};

type Held = {
  generation: number;
  refresh: string | null;
  access: string | null;
  forms: URLSearchParams[];
};

const refused = (
  status: number,
  error: string,
  description: string,
): FixtureAnswer => ({
  status,
  json: { error, error_description: description },
});

const unknownClient = refused(401, 'access_denied', 'Unauthorized');

const badCode = refused(403, 'invalid_grant', 'Invalid authorization code');

// What Atlassian answers a refresh token that was spent, expired after 90 days unused, or revoked.
const spentRefresh = refused(
  403,
  'unauthorized_client',
  'refresh_token is invalid',
);

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

const knownClient = (form: URLSearchParams): boolean =>
  form.get('client_id') === oauthClient.id &&
  form.get('client_secret') === oauthClient.secret;

// The callback URL registered with the app; Atlassian refuses an exchange that names another.
export const registeredCallback = 'http://127.0.0.1:51789/callback';

const badRedirect = refused(403, 'invalid_grant', 'redirect_uri is invalid');

function exchanged(held: Held, form: URLSearchParams): FixtureAnswer {
  if (form.get('redirect_uri') !== registeredCallback) return badRedirect;

  return form.get('code') === grantedCode ? issued(held) : badCode;
}

const refreshed = (held: Held, form: URLSearchParams): FixtureAnswer =>
  held.refresh !== null && form.get('refresh_token') === held.refresh
    ? issued(held)
    : spentRefresh;

function granted(held: Held, form: URLSearchParams): FixtureAnswer {
  if (!knownClient(form)) return unknownClient;

  return form.get('grant_type') === 'authorization_code'
    ? exchanged(held, form)
    : refreshed(held, form);
}

// The token endpoint, which takes the client secret on every exchange and refresh.
function tokenEndpoint(held: Held, request: FixtureRequest): FixtureAnswer {
  const form = new URLSearchParams(request.body);

  held.forms.push(form);

  return granted(held, form);
}

const bearerOf = (request: FixtureRequest): string =>
  String(request.headers.authorization).replace(/^Bearer /, '');

const resourcesOf = (held: Held, request: FixtureRequest): FixtureAnswer =>
  isIssued(held, bearerOf(request))
    ? { json: resources }
    : refused(401, 'unauthorized', 'Unauthorized');

const isIssued = (held: Held, token: string): boolean =>
  held.access !== null && token === held.access;

const tokenPath = '/oauth/token';

const resourcesPath = '/oauth/token/accessible-resources';

const isTokenEndpoint = ({ host, path }: FixtureRequest): boolean =>
  host === 'auth.atlassian.com' && path === tokenPath;

const isResources = ({ host, path }: FixtureRequest): boolean =>
  host === 'api.atlassian.com' && path === resourcesPath;

function answerOf(held: Held, request: FixtureRequest): FixtureAnswer | null {
  if (isTokenEndpoint(request)) return tokenEndpoint(held, request);

  return isResources(request) ? resourcesOf(held, request) : null;
}

const refreshesIn = (held: Held): URLSearchParams[] =>
  held.forms.filter((form) => form.get('grant_type') === 'refresh_token');

function revoked(held: Held): void {
  held.refresh = null;
}

function appRevoked(held: Held): void {
  held.access = null;
  held.refresh = null;
}

const freshHeld = (): Held => ({
  generation: 0,
  refresh: null,
  access: null,
  forms: [],
});

/*
 * `email` is what Jira's `myself` answers for the person signed in; a profile that hides its email answers none.
 */
export function atlassianOAuth({
  email = person.email,
}: { email?: string } = {}): AtlassianOAuth {
  const held = freshHeld();
  const signedIn = { ...person, email, scoped: true };

  return {
    who: (token) =>
      isIssued(held, token) ? { ...signedIn, token } : undefined,
    answer: (request) => answerOf(held, request),
    forms: () => held.forms,
    refreshes: () => refreshesIn(held),
    revoke: () => revoked(held),
    revokeApp: () => appRevoked(held),
  };
}
