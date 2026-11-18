import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import { at, text, type Json } from '../json';
import { boardRoutes } from './jira-board-routes';
import type {
  FixtureProject,
  FixtureSite,
  FixtureToken,
  JiraData,
} from './jira-data';
import { issueRoutes } from './jira-issue-routes';
import { filtered, type Filtered } from './jira-jql';
import { assignableIn, personJson } from './jira-people';
import { defaultLimit, pageOf, pagingOf } from './jira-search-page';

// One call that reached a site's Jira with a token it accepts: what a route answers from.
export type JiraCall = {
  request: FixtureRequest;
  data: JiraData;
  site: FixtureSite;
  who: FixtureToken;
  match: RegExpExecArray;
  query: URLSearchParams;
  body: Json | undefined;
};

// A name a test can fail it by, the method, a pattern over the path after `/rest/api/3`, and its answer.
export type JiraRoute = {
  name: string;
  method: string;
  path: RegExp;
  answer: (call: JiraCall) => FixtureAnswer;
};

const projectInJql = /project\s*=\s*"?(?<key>[^"\s]+)"?/i;

const keyOf = (groups: Partial<Record<string, string>> = {}): string =>
  groups.key ?? '';

const projectKeyOf = (jql: string): string =>
  keyOf(projectInJql.exec(jql)?.groups);

const projectIn = (
  site: FixtureSite,
  key: string,
): FixtureProject | undefined =>
  site.projects.find((project) => project.key === key);

const noSuchProject = (key: string): FixtureAnswer => ({
  status: 400,
  json: {
    errorMessages: [
      `The value '${key}' does not exist for the field 'project'.`,
    ],
  },
});

// Jira refuses JQL it cannot parse with a 400 naming the clause.
const unparsed = (clause: string): FixtureAnswer => ({
  status: 400,
  json: { errorMessages: [`Error in the JQL Query: ${clause}`] },
});

const searchAnswer = (
  found: Filtered,
  { body, projectKey }: { body: Json | undefined; projectKey: string },
): FixtureAnswer =>
  found.ok
    ? { json: pageOf({ issues: found.issues, projectKey }, pagingOf(body)) }
    : unparsed(found.clause);

type SearchReply = (
  found: Filtered,
  frame: { body: Json | undefined; projectKey: string },
) => FixtureAnswer;

function searchWith(
  { site, body, who }: JiraCall,
  reply: SearchReply,
): FixtureAnswer {
  const jql = text(at(body, 'jql')) ?? '';
  const key = projectKeyOf(jql);
  const project = projectIn(site, key);

  return project
    ? reply(filtered(jql, project.issues, who), {
        body,
        projectKey: key,
      })
    : noSuchProject(key);
}

const search = (call: JiraCall): FixtureAnswer =>
  searchWith(call, searchAnswer);

const count = (call: JiraCall): FixtureAnswer =>
  searchWith(call, (found) =>
    found.ok
      ? { json: { count: found.issues.length } }
      : unparsed(found.clause),
  );

const projectParam = ({ path }: FixtureRequest): string =>
  new URL(path, 'https://jira.test').searchParams.get('project') ?? '';

// The people an issue in the project the query names can be assigned to.
function people({ site, request, who }: JiraCall): FixtureAnswer {
  const key = projectParam(request);
  const project = projectIn(site, key);

  return project
    ? { json: assignableIn(who, { site, project }).map(personJson) }
    : noSuchProject(key);
}

const myself = ({ who }: JiraCall): FixtureAnswer => ({
  json: {
    accountId: who.accountId,
    displayName: who.displayName,
    emailAddress: who.email,
  },
});

const queryNumber = (
  query: URLSearchParams,
  name: string,
  fallback: number,
): number => Number(query.get(name) ?? fallback);

const projectJson = ({ id, key, name }: FixtureProject): Json => ({
  id,
  key,
  name,
});

// Jira's paged project search: `startAt` and `maxResults` in, `isLast` out.
function projects({ site, query }: JiraCall): FixtureAnswer {
  const startAt = queryNumber(query, 'startAt', 0);
  const end = startAt + queryNumber(query, 'maxResults', defaultLimit);
  const values = site.projects.slice(startAt, end).map(projectJson);

  return { json: { startAt, isLast: end >= site.projects.length, values } };
}

export const jiraRoutes: JiraRoute[] = [
  { name: 'myself', method: 'GET', path: /^\/myself$/, answer: myself },
  {
    name: 'projects',
    method: 'GET',
    path: /^\/project\/search$/,
    answer: projects,
  },
  { name: 'search', method: 'POST', path: /^\/search\/jql$/, answer: search },
  {
    name: 'approximate-count',
    method: 'POST',
    path: /^\/search\/approximate-count$/,
    answer: count,
  },
  {
    name: 'people',
    method: 'GET',
    path: /^\/user\/assignable\/search$/,
    answer: people,
  },
  ...issueRoutes,
  ...boardRoutes,
];
