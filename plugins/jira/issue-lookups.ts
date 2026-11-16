import { issueUrl } from './atlassian';
import type { StatusCategory } from './issue-fields';
import { call, located, type IssueCalls } from './issue-site';
import { jiraReaders, type JiraIssue, type JiraPerson } from './jira-readers';
import { jiraRequests } from './jira-requests';
import type { JiraSite } from './jira-store';
import { issueIn } from './project-issue';

/*
 * The read-only `getIssue` and `listIssues` Operations, for Agents (ADR-0044): an issue as its page shows it, and the
 * Project's Jira project's issues, each with the statuses `transition` can move it to now.
 */
type IssueRow = {
  key: string;
  summary: string;
  status: string;
  statusCategory: StatusCategory;
  assignee: JiraPerson | null;
  priority: string | null;
  labels: string[];
  movesTo: string[];
  url: string;
};

type IssueRead = IssueRow & { description: string };

const listLimit = { fallback: 20, most: 100 };

// The statuses Jira allows a move to, without the one the issue is in, which a global transition still lists.
const movesOf = ({ status, transitions }: JiraIssue): string[] => [
  ...new Set(
    transitions.flatMap(({ to }) => (to.id === status.id ? [] : [to.name])),
  ),
];

const rowOf = (site: JiraSite, issue: JiraIssue): IssueRow => ({
  key: issue.key,
  summary: issue.summary,
  status: issue.status.name,
  statusCategory: issue.status.category,
  assignee: issue.assignee,
  priority: issue.priority,
  labels: issue.labels,
  movesTo: movesOf(issue),
  url: issueUrl(site.host, issue.key),
});

export async function getIssue(
  argo: IssueCalls,
  { issue, projectId }: { issue: string; projectId: string },
): Promise<IssueRead> {
  const where = await located(argo, projectId);

  const found = await issueIn(where, issue);

  return { ...rowOf(where.site, found), description: found.description };
}

const limitOf = (limit = listLimit.fallback): number =>
  Math.min(Math.max(Math.trunc(limit), 1), listLimit.most);

type ListParams = { text?: string; limit?: number; projectId: string };

type Listed = { project: string; issues: IssueRow[]; more: boolean };

export async function listIssues(
  argo: IssueCalls,
  { text, limit, projectId }: ListParams,
): Promise<Listed> {
  const where = await located(argo, projectId);
  const project = where.projectKey;

  const page = await call(where, {
    request: jiraRequests.issues(project, { limit: limitOf(limit), text }),
    read: jiraReaders.issues,
  });

  const issues = page.issues.map((issue) => rowOf(where.site, issue));

  return { project, issues, more: page.cursor !== null };
}
