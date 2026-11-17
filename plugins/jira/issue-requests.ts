import type { JiraRequest } from './jira-client';

// The fields a list row and the issue's page show, so a search answers both.
export const issueFields = [
  'summary',
  'status',
  'assignee',
  'priority',
  'labels',
  'description',
  'project',
];

const issuePath = (key: string): string => `/issue/${encodeURIComponent(key)}`;

// The calls one issue's page and its Operations make: reading the issue, and the writes that change it.
export const issueRequests = {
  issue: (key: string): JiraRequest => ({
    path: `${issuePath(key)}?fields=${issueFields.join(',')}&expand=transitions`,
  }),
  transitions: (key: string): JiraRequest => ({
    path: `${issuePath(key)}/transitions`,
  }),
  transition: (key: string, transitionId: string): JiraRequest => ({
    path: `${issuePath(key)}/transitions`,
    method: 'POST',
    body: { transition: { id: transitionId } },
  }),
  // `null` unassigns the issue.
  assign: (key: string, accountId: string | null): JiraRequest => ({
    path: `${issuePath(key)}/assignee`,
    method: 'PUT',
    body: { accountId },
  }),
  setPriority: (key: string, priorityId: string): JiraRequest => ({
    path: issuePath(key),
    method: 'PUT',
    body: { fields: { priority: { id: priorityId } } },
  }),
  // Every priority on the site. `/priority/search` needs an admin scope, so this reads the older list.
  priorities: (): JiraRequest => ({ path: '/priority' }),
};
