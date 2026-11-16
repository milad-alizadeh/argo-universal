import { issueFields } from './issue-requests';
import type { JiraRequest } from './jira-client';

const pageSize = 50;

const quoted = (value: string): string =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

export type IssuesPage = { cursor?: string; limit?: number; text?: string };

const textMatch = (text?: string): string =>
  text ? ` AND text ~ ${quoted(text)}` : '';

// Jira's enhanced search body; a cursor goes in only when there is one.
function searchBody(projectKey: string, page: IssuesPage): JiraRequest['body'] {
  const body = {
    jql: `project = ${quoted(projectKey)}${textMatch(page.text)} ORDER BY updated DESC`,
    // A row seeds its issue's page, so the search asks for what the page shows too.
    fields: issueFields,
    expand: 'transitions',
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
