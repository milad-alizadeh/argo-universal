import type { GitHubRelations, GitHubSummary } from './github-relations';

// What gh prints for an Issue, and the checks every reader runs before it trusts a field.
export type IssueStatus = 'open' | 'closed';

export type GitHubName = { name?: string; login?: string; color?: string };

export type GitHubIssue = {
  number?: number;
  title?: string;
  state?: string;
  body?: string;
  url?: string;
  labels?: GitHubName[];
  assignees?: GitHubName[];
  stateReason?: string;
  parent?: { number?: unknown } | null;
  blockedBy?: GitHubRelations | null;
  subIssues?: GitHubRelations | null;
  subIssuesSummary?: GitHubSummary | null;
};

export const statuses = { OPEN: 'open', CLOSED: 'closed' } as const;

// An Issue GitHub filled: the fields every page reads are there and say what they should.
export type CheckedIssue = GitHubIssue & {
  number: number;
  title: string;
  state: keyof typeof statuses;
  url: string;
};

const issueChecks = [
  (issue: GitHubIssue): boolean => Number.isInteger(issue.number),
  (issue: GitHubIssue): boolean => typeof issue.title === 'string',
  (issue: GitHubIssue): boolean =>
    issue.state === 'OPEN' || issue.state === 'CLOSED',
  (issue: GitHubIssue): boolean =>
    typeof issue.url === 'string' &&
    issue.url.startsWith('https://github.com/'),
];

export function validIssue(issue: GitHubIssue | null): issue is CheckedIssue {
  return Boolean(
    issue &&
    !Array.isArray(issue) &&
    issueChecks.every((check) => check(issue)),
  );
}
