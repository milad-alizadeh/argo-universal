import type {
  JiraIssue,
  JiraRequest,
  JiraStatus,
  StatusCategory,
} from './jira-client';
import { at, list, text } from './json';

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

// Jira's reply as `jira-client` hands it to a reader.
type Read = unknown;

const categoryOf = (value: Read): StatusCategory =>
  categories.find((category) => category === value) ?? 'indeterminate';

function statusOf(json: Read): JiraStatus | null {
  const id = text(at(json, 'id'));

  if (!id) return null;

  return {
    id,
    name: text(at(json, 'name')) ?? id,
    category: categoryOf(at(json, 'statusCategory', 'key')),
  };
}

const present = <Value>(value: Value | null): value is Value => value !== null;

// Jira answers the statuses of each issue type; a status several types share is one column.
export const readStatuses = (json: Read): JiraStatus[] =>
  list(json)
    .flatMap((issueType) => list(at(issueType, 'statuses')))
    .map(statusOf)
    .filter(present);

const once = (statuses: JiraStatus[]): JiraStatus[] => [
  ...new Map(statuses.map((status) => [status.id, status])).values(),
];

const rank = (status: JiraStatus): number =>
  categories.indexOf(status.category);

/*
 * The columns, from the project's statuses and then any status an issue is in or may move to that they leave out, so
 * no card is without its column. Sorting is stable, so each category keeps Jira's order.
 */
export function boardColumns(
  statuses: JiraStatus[],
  issues: JiraIssue[],
): JiraStatus[] {
  const seen = issues.flatMap((issue) => [
    issue.status,
    ...issue.transitions.map(({ to }) => to),
  ]);

  return once([...statuses, ...seen]).sort((a, b) => rank(a) - rank(b));
}

// The columns a card may move to: the statuses Jira allows from its own, never the one it is in.
export const movesOf = (issue: JiraIssue): string[] => [
  ...new Set(
    issue.transitions
      .map(({ to }) => to.id)
      .filter((id) => id !== issue.status.id),
  ),
];
