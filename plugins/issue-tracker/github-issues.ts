// What gh prints, checked and mapped to the Issues the Tracker shows.
export type IssueStatus = 'open' | 'closed';

// Why GitHub closed an Issue: done, or set aside (not planned, or a duplicate).
type IssueClosedAs = 'completed' | 'not-planned';

// A label's colour is GitHub's own, as `#d73a4a`, or none when GitHub sends no valid one.
export type IssueLabel = { name: string; color?: string };

export type Issue = {
  number: number;
  title: string;
  status: IssueStatus;
  body: string;
  url: string;
  labels: IssueLabel[];
  assignees: string[];
  closedAs?: IssueClosedAs;
  // The number of the Issue this one is a sub-Issue of, when it has a parent.
  parent?: number;
};

type GitHubName = { name?: string; login?: string; color?: string };

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
};

export type GitHubCount = { total_count?: number };

export type GitHubLabel = Pick<GitHubName, 'name'>;

const statuses = { OPEN: 'open', CLOSED: 'closed' } as const;

const closedReasons = new Map<string, IssueClosedAs>([
  ['COMPLETED', 'completed'],
  ['NOT_PLANNED', 'not-planned'],
  ['DUPLICATE', 'not-planned'],
]);

type CheckedIssue = GitHubIssue & {
  number: number;
  title: string;
  state: keyof typeof statuses;
  url: string;
};

// Each reader names the shape it expects, and checks it before trusting a field.
export function parseJson<Reply>(
  output: string,
  description: string,
): Reply | null {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`${description} was not valid JSON.`);
  }
}

export function mapIssue(issue: GitHubIssue | null): Issue {
  if (!validIssue(issue)) throw new Error('GitHub returned an invalid Issue.');

  return {
    number: issue.number,
    title: issue.title,
    status: statuses[issue.state],
    body: typeof issue.body === 'string' ? issue.body : '',
    url: issue.url,
    labels: labels(issue.labels),
    assignees: names(issue.assignees, 'login'),
    ...closedAs(issue),
    ...parentOf(issue.parent),
  };
}

// A closed Issue's reason, when GitHub names one this Tracker knows.
function closedAs(issue: CheckedIssue): { closedAs?: IssueClosedAs } {
  const reason = closedReasons.get(String(issue.stateReason));

  return reason && issue.state === 'CLOSED' ? { closedAs: reason } : {};
}

const isIssueNumber = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;

// A parent is `{ number }`; anything else means no parent.
function parentOf(parent: GitHubIssue['parent']): { parent?: number } {
  const number = parent?.number;

  return isIssueNumber(number) ? { parent: number } : {};
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

function validIssue(issue: GitHubIssue | null): issue is CheckedIssue {
  return Boolean(
    issue &&
    !Array.isArray(issue) &&
    issueChecks.every((check) => check(issue)),
  );
}

// The total a GitHub search reports, whatever page it sent.
export function mapCount(result: GitHubCount | null): number {
  const { total_count: count } = result ?? {};

  if (!Number.isInteger(count))
    throw new Error('GitHub returned an invalid count.');

  return Number(count);
}

export function mapLabels(labels: GitHubLabel[] | null): string[] {
  if (!Array.isArray(labels))
    throw new Error('GitHub returned an invalid label list.');

  return names(labels);
}

const hexColor = /^[0-9a-f]{6}$/i;

function labels(values: GitHubName[] | undefined): IssueLabel[] {
  if (!Array.isArray(values)) return [];

  return values.flatMap((value) =>
    typeof value?.name === 'string'
      ? [labelColor(value.name, value.color)]
      : [],
  );
}

function labelColor(name: string, color: string | undefined): IssueLabel {
  return typeof color === 'string' && hexColor.test(color)
    ? { name, color: `#${color}` }
    : { name };
}

function names(
  values: GitHubName[] | undefined,
  key: keyof GitHubName = 'name',
): string[] {
  if (!Array.isArray(values)) return [];

  return values.flatMap((value) => {
    const name = value?.[key];

    return typeof name === 'string' ? [name] : [];
  });
}
