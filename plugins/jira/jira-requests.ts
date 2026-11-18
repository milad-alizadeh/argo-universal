import { issueFields } from './issue-requests';
import type { JiraRequest } from './jira-client';
import {
  filterClauses,
  orderClauses,
  quoted,
  type IssueFilters,
} from './jira-filters';

const pageSize = 50;

// How many people the assignee filter offers by name, beside Anyone, Me and Unassigned.
const peopleLimit = 50;

const projectPageSize = 100;

// `limit` is for an Agent's `listIssues`; the list takes Jira's page size.
export type IssuesPage = Readonly<{
  cursor: string | null;
  filters: IssueFilters;
  limit?: number;
}>;

// The project's issues the filters leave, in the order they ask for: the most recently updated first unless they say.
const jqlOf = (projectKey: string, filters: IssueFilters): string =>
  [`project = ${quoted(projectKey)}`, ...filterClauses(filters)]
    .join(' AND ')
    .concat(` ORDER BY ${orderClauses[filters.sort]}`);

// Jira's enhanced search body; a cursor goes in only when there is one.
function searchBody(
  projectKey: string,
  { cursor, filters, limit = pageSize }: IssuesPage,
): JiraRequest['body'] {
  const body = {
    jql: jqlOf(projectKey, filters),
    // A row seeds its issue's page, so the search asks for what the page shows too.
    fields: issueFields,
    expand: 'transitions',
    maxResults: limit,
  };

  return cursor ? { ...body, nextPageToken: cursor } : body;
}

export const jiraRequests = {
  myself: (): JiraRequest => ({ path: '/myself' }),
  // One page of the projects the person can see, by name, from `startAt`.
  projects: (startAt = 0): JiraRequest => ({
    path: `/project/search?startAt=${startAt}&maxResults=${projectPageSize}&orderBy=name`,
  }),
  // A project's issues the filters leave, paged by Jira's `nextPageToken`.
  issues: (projectKey: string, page: IssuesPage): JiraRequest => ({
    path: '/search/jql',
    method: 'POST',
    body: searchBody(projectKey, page),
  }),
  // The people an issue in the project can be assigned to.
  people: (projectKey: string): JiraRequest => ({
    path: `/user/assignable/search?project=${encodeURIComponent(projectKey)}&maxResults=${peopleLimit}`,
  }),
};
