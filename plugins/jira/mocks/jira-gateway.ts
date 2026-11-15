import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import { parseJson } from '../json';
import type { FixtureSite, FixtureToken, JiraData } from './jira-data';
import type { JiraCall, JiraRoute } from './jira-routes';

// What a request reached: a named route, or tenant info, and its answer.
export type Routed = { name: string; answer: () => FixtureAnswer };

export type Routing = { data: JiraData; routes: JiraRoute[] };

const unauthorized: FixtureAnswer = {
  status: 401,
  json: {
    code: 401,
    message: 'Client must be authenticated to access this resource.',
  },
};

export const notFound = (what: string): FixtureAnswer => ({
  status: 404,
  json: { errorMessages: [`${what} does not exist.`], errors: {} },
});

type Located = { site: FixtureSite; apiPath: string; scoped: boolean };

const gateway =
  /^\/ex\/jira\/(?<cloudId>[^/]+)\/rest\/api\/3(?<apiPath>\/[^?]*)/;

const sitePath = /^\/rest\/api\/3(?<apiPath>\/[^?]*)/;

type Groups = Partial<Record<string, string>>;

const groupsOf = (pattern: RegExp, path: string): Groups =>
  pattern.exec(path)?.groups ?? {};

// Atlassian's gateway, which only scoped tokens open, for the site whose cloud the path names.
function throughGateway(data: JiraData, path: string): Located | null {
  const groups = groupsOf(gateway, path);
  const site = data.sites.find(({ cloudId }) => cloudId === groups.cloudId);

  return site ? { site, apiPath: groups.apiPath ?? '', scoped: true } : null;
}

// The site's own API, which only unscoped tokens open.
function onSite(
  data: JiraData,
  { host, path }: FixtureRequest,
): Located | null {
  const { apiPath } = groupsOf(sitePath, path);
  const site = data.sites.find((each) => each.host === host);

  return site ? { site, apiPath: apiPath ?? '', scoped: false } : null;
}

const locate = (data: JiraData, request: FixtureRequest): Located | null =>
  request.host === 'api.atlassian.com'
    ? throughGateway(data, request.path)
    : onSite(data, request);

const credentialOf = ({ headers }: FixtureRequest): string =>
  Buffer.from(
    String(headers.authorization).replace(/^Basic /, ''),
    'base64',
  ).toString();

// Whose token a request carries, when it is one Atlassian issued for where it was sent.
function admitted(
  data: JiraData,
  request: FixtureRequest,
  located: Located,
): FixtureToken | null {
  const credential = credentialOf(request);

  const who = data.tokens.find(
    ({ email, token }) => `${email}:${token}` === credential,
  );

  return who?.scoped === located.scoped ? who : null;
}

type Entry = { request: FixtureRequest; located: Located; who: FixtureToken };

const matchOf = (
  route: JiraRoute,
  { request, located }: Entry,
): RegExpExecArray | null =>
  route.method === request.method ? route.path.exec(located.apiPath) : null;

const callOf = (
  routing: Routing,
  entry: Entry,
  match: RegExpExecArray,
): JiraCall => ({
  ...entry,
  site: entry.located.site,
  data: routing.data,
  match,
  body: parseJson(entry.request.body),
});

const routeTo = (route: JiraRoute, call: JiraCall): Routed => ({
  name: route.name,
  answer: () => route.answer(call),
});

function matched(routing: Routing, entry: Entry): Routed | FixtureAnswer {
  for (const route of routing.routes) {
    const match = matchOf(route, entry);

    if (match) return routeTo(route, callOf(routing, entry, match));
  }

  return notFound(`${entry.request.method} ${entry.located.apiPath}`);
}

// The route a call to Jira reaches, or what Jira answers a call no route takes.
export function routed(
  routing: Routing,
  request: FixtureRequest,
): Routed | FixtureAnswer {
  const located = locate(routing.data, request);

  if (!located) return notFound('Site');

  const who = admitted(routing.data, request, located);

  return who ? matched(routing, { request, located, who }) : unauthorized;
}
