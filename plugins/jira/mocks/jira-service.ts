import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from '@argo/plugin-kit/testing';
import {
  jiraData,
  type FixtureSite,
  type FixtureToken,
  type JiraData,
} from './jira-data';
import { issueJson, issueRoutes } from './jira-issue-routes';

/*
 * Jira Cloud as the Plugin meets it, for its tests: Atlassian's gateway at `api.atlassian.com/ex/jira/<cloudId>`, which
 * takes a scoped token as Basic auth, each site's own API at `<site>.atlassian.net`, which takes only an unscoped one,
 * and the site's public tenant info. Every call the Plugin makes reaches one handler over a certificate the test trusts.
 *
 * Extend it by adding a route: a name, a method, a pattern over the path after `/rest/api/3`, and an answer. A test
 * can make any named route fail with `fail(name, answer)`.
 */
export type JiraCall = {
  request: FixtureRequest;
  data: JiraData;
  site: FixtureSite;
  who: FixtureToken;
  match: RegExpMatchArray;
  query: URLSearchParams;
  body: unknown;
};

export type JiraRoute = {
  name: string;
  method: string;
  path: RegExp;
  answer: (call: JiraCall) => FixtureAnswer;
};

export type JiraService = Pick<FixtureServices, 'network' | 'requests'> & {
  data: JiraData;
  // Answers every call to a named route with this until `heal(name)`.
  fail: (name: string, answer: FixtureAnswer) => void;
  heal: (name: string) => void;
  // Holds every call to a named route unanswered until the returned function lets them go, as a slow Jira does.
  hold: (name: string) => () => void;
  // The calls that reached a named route, in order.
  calls: (name: string) => FixtureRequest[];
};

const unauthorized: FixtureAnswer = {
  status: 401,
  json: {
    code: 401,
    message: 'Client must be authenticated to access this resource.',
  },
};

const notFound = (what: string): FixtureAnswer => ({
  status: 404,
  json: { errorMessages: [`${what} does not exist.`], errors: {} },
});

const projectKeyOf = (jql: unknown): string | null =>
  typeof jql === 'string'
    ? (/project\s*=\s*"?([^"\s]+)"?/i.exec(jql)?.[1] ?? null)
    : null;

const fieldOf = (body: unknown, key: string): unknown =>
  typeof body === 'object' && body !== null
    ? Reflect.get(body, key)
    : undefined;

// Jira's enhanced search: one page of a project's issues, with a `nextPageToken` while more are left.
function search({ site, body }: JiraCall): FixtureAnswer {
  const key = projectKeyOf(fieldOf(body, 'jql'));
  const project = site.projects.find((each) => each.key === key);

  if (!project)
    return {
      status: 400,
      json: {
        errorMessages: [
          `The value '${key}' does not exist for the field 'project'.`,
        ],
      },
    };

  const limit = Number(fieldOf(body, 'maxResults') ?? 50);
  const start = Number(fieldOf(body, 'nextPageToken') ?? 0);
  const page = project.issues.slice(start, start + limit);
  const next = start + limit;
  const isLast = next >= project.issues.length;

  return {
    json: {
      issues: page.map((issue, index) =>
        issueJson(issue, start + index, String(fieldOf(body, 'expand') ?? '')),
      ),
      isLast,
      ...(isLast ? {} : { nextPageToken: String(next) }),
    },
  };
}

export const jiraRoutes: JiraRoute[] = [
  {
    name: 'myself',
    method: 'GET',
    path: /^\/myself$/,
    answer: ({ who }) => ({
      json: {
        accountId: who.accountId,
        displayName: who.displayName,
        emailAddress: who.email,
      },
    }),
  },
  {
    name: 'projects',
    method: 'GET',
    path: /^\/project\/search$/,
    answer: ({ site }) => ({
      json: {
        isLast: true,
        values: site.projects.map(({ id, key, name }) => ({ id, key, name })),
      },
    }),
  },
  { name: 'search', method: 'POST', path: /^\/search\/jql$/, answer: search },
  ...issueRoutes,
];

const decoded = (header: string | string[] | undefined): string =>
  Buffer.from(String(header).replace(/^Basic /, ''), 'base64').toString();

// Whose token a request carries, if it is one Atlassian issued.
function tokenOf(
  data: JiraData,
  request: FixtureRequest,
): FixtureToken | undefined {
  const credential = decoded(request.headers.authorization);

  return data.tokens.find(
    ({ email, token }) => `${email}:${token}` === credential,
  );
}

type Located = { site: FixtureSite; apiPath: string; scoped: boolean };

const gateway = /^\/ex\/jira\/([^/]+)\/rest\/api\/3(\/[^?]*)/;

const sitePath = /^\/rest\/api\/3(\/[^?]*)/;

// Which site's API a request reaches, and whether through Atlassian's gateway, which only scoped tokens open.
function locate(data: JiraData, request: FixtureRequest): Located | null {
  const throughGateway =
    request.host === 'api.atlassian.com' ? gateway.exec(request.path) : null;

  if (throughGateway) {
    const site = data.sites.find(
      ({ cloudId }) => cloudId === throughGateway[1],
    );

    return site
      ? { site, apiPath: throughGateway[2] ?? '', scoped: true }
      : null;
  }

  const onSite = sitePath.exec(request.path);
  const site = data.sites.find(({ host }) => host === request.host);

  return onSite && site
    ? { site, apiPath: onSite[1] ?? '', scoped: false }
    : null;
}

function parsedBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

type Service = {
  data: JiraData;
  routes: JiraRoute[];
  failing: Map<string, FixtureAnswer>;
  held: Map<string, Promise<void>>;
};

function tenantInfo(data: JiraData, host: string): FixtureAnswer {
  const site = data.sites.find((each) => each.host === host);

  return site ? { json: { cloudId: site.cloudId } } : notFound('Site');
}

function routed(
  service: Service,
  request: FixtureRequest,
): { route: JiraRoute; call: JiraCall } | FixtureAnswer {
  const located = locate(service.data, request);

  if (!located) return notFound('Site');

  const who = tokenOf(service.data, request);

  if (!who || who.scoped !== located.scoped) return unauthorized;

  for (const route of service.routes) {
    const match =
      route.method === request.method ? route.path.exec(located.apiPath) : null;

    if (match)
      return {
        route,
        call: {
          request,
          data: service.data,
          site: located.site,
          who,
          match,
          query: new URLSearchParams(request.path.split('?')[1] ?? ''),
          body: parsedBody(request.body),
        },
      };
  }

  return notFound(`${request.method} ${located.apiPath}`);
}

const routeNames = new WeakMap<FixtureRequest, string>();

function answer(
  service: Service,
  request: FixtureRequest,
): FixtureAnswer | Promise<FixtureAnswer> {
  if (request.path === '/_edge/tenant_info') {
    routeNames.set(request, 'tenant');

    return (
      service.failing.get('tenant') ?? tenantInfo(service.data, request.host)
    );
  }

  const found = routed(service, request);

  if (!('route' in found)) return found;

  const { route, call } = found;

  routeNames.set(request, route.name);

  const answered = (): FixtureAnswer =>
    service.failing.get(route.name) ?? route.answer(call);
  const held = service.held.get(route.name);

  return held ? held.then(answered) : answered();
}

export async function jiraService(
  options: { data?: JiraData; routes?: JiraRoute[] } = {},
): Promise<JiraService> {
  const service: Service = {
    data: options.data ?? jiraData(),
    routes: [...(options.routes ?? []), ...jiraRoutes],
    failing: new Map(),
    held: new Map(),
  };

  const { network, requests } = await fixtureServices((request) =>
    answer(service, request),
  );

  return {
    network,
    requests,
    data: service.data,
    fail: (name, failure) => void service.failing.set(name, failure),
    heal: (name) => void service.failing.delete(name),
    hold: (name) => {
      let release = (): void => {};

      service.held.set(
        name,
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      );

      return () => {
        service.held.delete(name);
        release();
      };
    },
    calls: (name) =>
      requests.filter((request) => routeNames.get(request) === name),
  };
}
