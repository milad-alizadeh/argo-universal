import type { JiraRequest } from './jira-client';

// The fields a list row shows; a detail page asks for more.
export const rowFields = ['summary', 'status', 'assignee', 'priority'];

const pageSize = 50;

const quoted = (value: string): string =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

export type IssuesPage = { cursor?: string; limit?: number };

// Jira's enhanced search body; a cursor goes in only when there is one.
function searchBody(projectKey: string, page: IssuesPage): JiraRequest['body'] {
  const body = {
    jql: `project = ${quoted(projectKey)} ORDER BY updated DESC`,
    fields: rowFields,
    maxResults: page.limit ?? pageSize,
  };

  return page.cursor ? { ...body, nextPageToken: page.cursor } : body;
}

export const jiraRequests = {
  myself: (): JiraRequest => ({ path: '/myself' }),
  projects: (): JiraRequest => ({
    path: '/project/search?maxResults=100&orderBy=name',
  }),
  // A project's issues, the most recently updated first, paged by Jira's `nextPageToken`.
  issues: (projectKey: string, page: IssuesPage = {}): JiraRequest => ({
    path: '/search/jql',
    method: 'POST',
    body: searchBody(projectKey, page),
  }),
};
