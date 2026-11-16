import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from '@argo/plugin-kit/testing';
import {
  jiraData,
  type FixtureIssue,
  type FixtureSite,
  type FixtureToken,
  type JiraData,
} from './jira-data';

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

const issueJson = (issue: FixtureIssue, index: number) => ({
  id: String(10_000 + index),
  key: issue.key,
  fields: {
    summary: issue.summary,
    status: {
      name: issue.status.name,
      statusCategory: { key: issue.status.category },
    },
    assignee: issue.assignee,
    priority: issue.priority ? { name: issue.priority } : null,
  },
});

const projectKeyOf = (jql: unknown): string | null =>
  typeof jql === 'string'
    ? (/project\s*=\s*"?([^"\s]+)"?/i.exec(jql)?.[1] ?? null)
    : null;

const categoryNames: Record<FixtureIssue['status']['category'], string> = {
  new: 'To Do',
  indeterminate: 'In Progress',
  done: 'Done',
};

const unquoted = (value: string): string =>
  value.replaceAll('\\"', '"').replaceAll('\\\\', '\\');

type Match = (issue: FixtureIssue, who: FixtureToken) => boolean;

/*
 * The JQL clauses the Plugin's filters send, as Jira reads them: a status category by name, an assignee (the caller,
 * nobody, or one account id), and words every one of which the summary holds. Any other clause matches every issue.
 */
function clauseMatch(clause: string): Match {
  const category = /^statusCategory = "(.*)"$/u.exec(clause);
  const assignee = /^assignee = "(.*)"$/u.exec(clause);
  const words = /^text ~ "(.*)"$/u.exec(clause);

  if (category)
    return (issue) =>
      categoryNames[issue.status.category] === unquoted(category[1] ?? '');

  if (clause === 'assignee = currentUser()')
    return (issue, who) => issue.assignee?.accountId === who.accountId;

  if (clause === 'assignee is EMPTY') return (issue) => issue.assignee === null;

  if (assignee)
    return (issue) =>
      issue.assignee?.accountId === unquoted(assignee[1] ?? '');

  if (words)
    return (issue) =>
      unquoted(words[1] ?? '')
        .toLowerCase()
        .split(' ')
        .every((word) => issue.summary.toLowerCase().includes(word));

  return () => true;
}

const clausesOf = (jql: unknown): Match[] =>
  typeof jql === 'string'
    ? (jql.split(' ORDER BY ')[0] ?? '')
        .split(' AND ')
        .slice(1)
        .map(clauseMatch)
    : [];

const fieldOf = (body: unknown, key: string): unknown =>
  typeof body === 'object' && body !== null
    ? Reflect.get(body, key)
    : undefined;

// Jira's enhanced search: one page of a project's issues, with a `nextPageToken` while more are left.
function search({ site, body, who }: JiraCall): FixtureAnswer {
  const key = projectKeyOf(fieldOf(body, 'jql'));
  const clauses = clausesOf(fieldOf(body, 'jql'));
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
  const found = project.issues.filter((issue) =>
    clauses.every((matches) => matches(issue, who)),
  );
  const page = found.slice(start, start + limit);
  const next = start + limit;
  const isLast = next >= found.length;

  return {
    json: {
      issues: page.map((issue, index) => issueJson(issue, start + index)),
      isLast,
      ...(isLast ? {} : { nextPageToken: String(next) }),
    },
  };
}

// The people a project's issues can be assigned to: everyone its issues are assigned to, and the caller.
function people({ site, query, who }: JiraCall): FixtureAnswer {
  const project = site.projects.find((each) => each.key === query.get('project'));

  if (!project) return notFound('Project');

  const assignees = project.issues.flatMap(({ assignee }) =>
    assignee ? [assignee] : [],
  );
  const everyone = new Map(
    [{ accountId: who.accountId, displayName: who.displayName }, ...assignees].map(
      (person) => [person.accountId, person],
    ),
  );

  return {
    json: [...everyone.values()].map((person) => ({
      ...person,
      accountType: 'atlassian',
    })),
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
  { name: 'people', method: 'GET', path: /^\/user\/assignable\/search$/, answer: people },
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

function answer(service: Service, request: FixtureRequest): FixtureAnswer {
  if (request.path === '/_edge/tenant_info') {
    routeNames.set(request, 'tenant');

    return (
      service.failing.get('tenant') ?? tenantInfo(service.data, request.host)
    );
  }

  const found = routed(service, request);

  if (!('route' in found)) return found;

  routeNames.set(request, found.route.name);

  return (
    service.failing.get(found.route.name) ?? found.route.answer(found.call)
  );
}

export async function jiraService(
  options: { data?: JiraData; routes?: JiraRoute[] } = {},
): Promise<JiraService> {
  const service: Service = {
    data: options.data ?? jiraData(),
    routes: [...(options.routes ?? []), ...jiraRoutes],
    failing: new Map(),
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
    calls: (name) =>
      requests.filter((request) => routeNames.get(request) === name),
  };
}
