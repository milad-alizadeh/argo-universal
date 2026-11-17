import { statusOf, type JiraStatus, type StatusCategory } from './issue-fields';
import type { JiraRequest } from './jira-client';
import type { JiraIssue } from './jira-readers';
import { at, list, type Json } from './json';

/*
 * The board's columns: the Jira project's statuses, grouped by status category as Jira's own board is (to do, then in
 * progress, then done), each group in the order Jira lists them. A card names as its moves the statuses Jira allows
 * from its current one, so only those columns take its drop.
 */

// The board's accessible name, which a test finds it by.
export const boardLabel = 'Jira board';

export const statusesRequest = (projectKey: string): JiraRequest => ({
  path: `/project/${encodeURIComponent(projectKey)}/statuses`,
});

const categories: readonly StatusCategory[] = ['new', 'indeterminate', 'done'];

const known = (status: JiraStatus): boolean => status.id !== '';

// Jira answers the statuses of each issue type; a status several types share is one column.
export const readStatuses = (json: Json | undefined): JiraStatus[] =>
  list(json)
    .flatMap((issueType) => list(at(issueType, 'statuses')))
    .map(statusOf)
    .filter(known);

const once = (statuses: JiraStatus[]): JiraStatus[] => [
  ...new Map(statuses.map((status) => [status.id, status])).values(),
];

const rank = (status: JiraStatus): number =>
  categories.indexOf(status.category);

const shownBy = (issue: JiraIssue): JiraStatus[] => [
  issue.status,
  ...issue.transitions.map(({ to }) => to),
];

/*
 * The columns, from the project's statuses and then any status an issue is in or may move to that they leave out, so
 * no card is without its column. Sorting is stable, so each category keeps Jira's order.
 */
export const boardColumns = (
  statuses: JiraStatus[],
  issues: JiraIssue[],
): JiraStatus[] =>
  once([...statuses, ...issues.flatMap(shownBy)]).sort(
    (a, b) => rank(a) - rank(b),
  );

// The columns a card may move to: the statuses Jira allows from its own, never the one it is in.
export const movesOf = ({ status, transitions }: JiraIssue): string[] => [
  ...new Set(
    transitions.map(({ to }) => to.id).filter((id) => id !== status.id),
  ),
];
