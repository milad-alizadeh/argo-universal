import { githubError } from './github-errors';
import type { Issue, IssueStatus } from './github-issues';
import { type IssueRequest, setIssueStatus } from './issue-client';
import type { Project } from './issue-data';

type Update<Value> = (update: (current: Value) => Value) => void;

// The open Issue, and the list and detail that show its status.
export type StatusChange<Selected extends { issue: Issue }> = {
  request: IssueRequest | null;
  setIssues: Update<Issue[]>;
  setSelected: Update<Selected | null>;
};

export function statusRequest(
  project: Project | undefined,
  selected: { issue: Issue } | null,
  dependencies: Pick<IssueRequest, 'storage' | 'trackers'>,
): IssueRequest | null {
  return project && selected
    ? { project, issue: selected.issue, ...dependencies }
    : null;
}

// Shows the new status at once, and the old one again when the Tracker refuses it.
export async function changeStatus<Selected extends { issue: Issue }>(
  change: StatusChange<Selected>,
  status: IssueStatus,
): Promise<void> {
  const { request } = change;

  if (request) await applyStatus(change, request, status);
}

async function applyStatus<Selected extends { issue: Issue }>(
  change: StatusChange<Selected>,
  request: IssueRequest,
  status: IssueStatus,
): Promise<void> {
  const { issue } = request;

  showStatus(change, issue.url, status);

  try {
    await setIssueStatus(request, status);
  } catch (error) {
    showStatus(change, issue.url, issue.status);
    throw new Error(githubError(error));
  }
}

// An Issue's URL names it across Projects, so a change lands on that Issue alone.
function showStatus<Selected extends { issue: Issue }>(
  { setIssues, setSelected }: StatusChange<Selected>,
  url: string,
  status: IssueStatus,
): void {
  const withStatus = (issue: Issue): Issue =>
    issue.url === url ? { ...issue, status } : issue;

  setIssues((issues) => issues.map(withStatus));
  setSelected(
    (selected) =>
      selected && { ...selected, issue: withStatus(selected.issue) },
  );
}
