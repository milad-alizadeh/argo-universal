import { issueUrl } from './atlassian';
import type { StatusCategory } from './issue-fields';
import { issueRequests } from './issue-requests';
import { call, located, type IssueCalls } from './issue-site';
import {
  issueOf,
  jiraReaders,
  type JiraIssue,
  type JiraPerson,
} from './jira-readers';
import { jiraRequests } from './jira-requests';
import type { JiraSite } from './jira-store';

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

const noProject =
  'Choose a Jira project for this Project first, on its Jira page.';

const rowOf = (site: JiraSite, issue: JiraIssue): IssueRow => ({
  key: issue.key,
  summary: issue.summary,
  status: issue.status.name,
  statusCategory: issue.status.category,
  assignee: issue.assignee,
  priority: issue.priority,
  labels: issue.labels,
  movesTo: [...new Set(issue.transitions.map(({ to }) => to.name))],
  url: issueUrl(site.host, issue.key),
});

export async function getIssue(
  argo: IssueCalls,
  { issue, projectId }: { issue: string; projectId: string },
): Promise<IssueRead> {
  const where = await located(argo, projectId);

  const found = await call(where, {
    request: issueRequests.issue(issue),
    read: issueOf,
  });

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

  if (!project) throw new Error(noProject);

  const page = await call(where, {
    request: jiraRequests.issues(project, { limit: limitOf(limit), text }),
    read: jiraReaders.issues,
  });

  const issues = page.issues.map((issue) => rowOf(where.site, issue));

  return { project, issues, more: page.cursor !== null };
}
