import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import { at, text, type Json } from '../json';
import type {
  FixtureIssue,
  FixtureProject,
  FixtureSite,
  FixtureToken,
  JiraData,
} from './jira-data';

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

const issueJson = (issue: FixtureIssue): Json => ({
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

const defaultLimit = 50;

type Paging = { start: number; limit: number };

const pagingOf = (body: Json | undefined): Paging => ({
  start: Number(at(body, 'nextPageToken') ?? 0),
  limit: Number(at(body, 'maxResults') ?? defaultLimit),
});

// One page of issues, with a `nextPageToken` while more are left.
function pageOf(issues: FixtureIssue[], { start, limit }: Paging): Json {
  const next = start + limit;
  const isLast = next >= issues.length;
  const page = { issues: issues.slice(start, next).map(issueJson), isLast };

  return isLast ? page : { ...page, nextPageToken: String(next) };
}

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

// Jira's enhanced search, for the `project = "KEY"` its JQL names.
function search({ site, body }: JiraCall): FixtureAnswer {
  const key = projectKeyOf(text(at(body, 'jql')) ?? '');
  const project = projectIn(site, key);

  return project
    ? { json: pageOf(project.issues, pagingOf(body)) }
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
];
