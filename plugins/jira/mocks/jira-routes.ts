import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import { at, text, type Json } from '../json';
import type {
  FixtureIssue,
  FixtureProject,
  FixtureSite,
  FixtureToken,
  JiraData,
} from './jira-data';
import { filtered } from './jira-jql';

// One call that reached a site's Jira with a token it accepts: what a route answers from.
export type JiraCall = {
  request: FixtureRequest;
  data: JiraData;
  site: FixtureSite;
  who: FixtureToken;
  match: RegExpExecArray;
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

// Jira's enhanced search, for the `project = "KEY"` its JQL names and the filters after it.
function search({ site, body, who }: JiraCall): FixtureAnswer {
  const jql = text(at(body, 'jql')) ?? '';
  const key = projectKeyOf(jql);
  const project = projectIn(site, key);

  return project
    ? { json: pageOf(filtered(jql, project.issues, who), pagingOf(body)) }
    : noSuchProject(key);
}

type Person = NonNullable<FixtureIssue['assignee']>;

const assigneesOf = ({ issues }: FixtureProject): Person[] =>
  issues.flatMap(({ assignee }) => (assignee ? [assignee] : []));

const personJson = ({ accountId, displayName }: Person): Json => ({
  accountId,
  displayName,
  accountType: 'atlassian',
});

// Everyone a project's issues can be assigned to, once each: the caller, and everyone its issues are assigned to.
const assignable = (who: Person, project: FixtureProject): Json[] => [
  ...new Map(
    [who, ...assigneesOf(project)].map((person) => [
      person.accountId,
      personJson(person),
    ]),
  ).values(),
];

const projectParam = ({ path }: FixtureRequest): string =>
  new URL(path, 'https://jira.test').searchParams.get('project') ?? '';

// The people an issue in the project the query names can be assigned to.
function people({ site, request, who }: JiraCall): FixtureAnswer {
  const key = projectParam(request);
  const project = projectIn(site, key);

  return project ? { json: assignable(who, project) } : noSuchProject(key);
}

const myself = ({ who }: JiraCall): FixtureAnswer => ({
  json: {
    accountId: who.accountId,
    displayName: who.displayName,
    emailAddress: who.email,
  },
});

const projects = ({ site }: JiraCall): FixtureAnswer => ({
  json: {
    isLast: true,
    values: site.projects.map(({ id, key, name }) => ({ id, key, name })),
  },
});

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
    name: 'people',
    method: 'GET',
    path: /^\/user\/assignable\/search$/,
    answer: people,
  },
];
