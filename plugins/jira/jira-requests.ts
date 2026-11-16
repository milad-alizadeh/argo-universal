import type { JiraRequest } from './jira-client';
import { filterClauses, quoted, type IssueFilters } from './jira-filters';

// The fields a list row shows; a detail page asks for more.
const rowFields = ['summary', 'status', 'assignee', 'priority'];

const pageSize = 50;

// How many people the assignee filter offers by name, beside Anyone, Me and Unassigned.
const peopleLimit = 50;

const projectPageSize = 100;

export type IssuesPage = Readonly<{
  cursor: string | null;
  filters: IssueFilters;
}>;

// The project's issues the filters leave, the most recently updated first.
const jqlOf = (projectKey: string, filters: IssueFilters): string =>
  [`project = ${quoted(projectKey)}`, ...filterClauses(filters)]
    .join(' AND ')
    .concat(' ORDER BY updated DESC');

// Jira's enhanced search body; a cursor goes in only when there is one.
function searchBody(
  projectKey: string,
  { cursor, filters }: IssuesPage,
): JiraRequest['body'] {
  const body = {
    jql: jqlOf(projectKey, filters),
    fields: rowFields,
    maxResults: pageSize,
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
