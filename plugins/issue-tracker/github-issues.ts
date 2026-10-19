import type { Issue } from './issue-types';

// What gh prints, before each Issue is checked.
type GitHubName = { name?: string; login?: string };

export type GitHubIssue = {
  number?: number;
  title?: string;
  state?: string;
  body?: string;
  url?: string;
  labels?: GitHubName[];
  assignees?: GitHubName[];
};

export type GitHubJson = GitHubIssue | GitHubIssue[] | null;

type CheckedIssue = GitHubIssue & {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED';
  url: string;
};

export function parseJson(output: string, description: string): GitHubJson {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`${description} was not valid JSON.`);
  }
}

export function mapIssue(issue: GitHubJson): Issue {
  if (!validIssue(issue)) throw new Error('GitHub returned an invalid Issue.');

  return {
    number: issue.number,
    title: issue.title,
    status: issue.state.toLowerCase(),
    body: typeof issue.body === 'string' ? issue.body : '',
    url: issue.url,
    labels: names(issue.labels, 'name'),
    assignees: names(issue.assignees, 'login'),
  };
}

const issueChecks = [
  (issue: GitHubIssue): boolean => Number.isInteger(issue.number),
  (issue: GitHubIssue): boolean => typeof issue.title === 'string',
  (issue: GitHubIssue): boolean =>
    issue.state === 'OPEN' || issue.state === 'CLOSED',
  (issue: GitHubIssue): boolean =>
    typeof issue.url === 'string' &&
    issue.url.startsWith('https://github.com/'),
];

function validIssue(issue: GitHubJson): issue is CheckedIssue {
  return Boolean(
    issue &&
    !Array.isArray(issue) &&
    issueChecks.every((check) => check(issue)),
  );
}

function names(
  values: GitHubName[] | undefined,
  key: keyof GitHubName,
): string[] {
  if (!Array.isArray(values)) return [];

  return values.flatMap((value) => {
    const name = value?.[key];

    return typeof name === 'string' ? [name] : [];
  });
}
