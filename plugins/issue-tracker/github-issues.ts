import {
  statuses,
  validIssue,
  type CheckedIssue,
  type GitHubIssue,
  type GitHubName,
  type IssueStatus,
} from './github-issue-shape';
import {
  progressOf,
  relations,
  type IssueProgress,
  type IssueRelation,
} from './github-relations';

// What gh prints, checked and mapped to the Issues the Tracker shows.
export type { GitHubIssue, IssueStatus } from './github-issue-shape';

export type { IssueProgress, IssueRelation } from './github-relations';

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
  // The Issues that block this one, open and closed alike; absent when none do.
  blockedBy?: IssueRelation[];
  // This Issue's sub-Issues, closed ones included; absent when it has none.
  children?: IssueRelation[];
  // The sub-Issue tally, absent when this Issue has no sub-Issues.
  progress?: IssueProgress;
};

export type GitHubCount = { total_count?: number };

export type GitHubLabel = Pick<GitHubName, 'name'>;

const closedReasons = new Map<string, IssueClosedAs>([
  ['COMPLETED', 'completed'],
  ['NOT_PLANNED', 'not-planned'],
  ['DUPLICATE', 'not-planned'],
]);

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

  return { ...issueFields(issue), ...issueLinks(issue) };
}

type IssueLinks = Pick<Issue, 'parent' | 'blockedBy' | 'children' | 'progress'>;

// What the Issue says of itself, before the Issues around it.
const issueFields = (issue: CheckedIssue): Omit<Issue, keyof IssueLinks> => ({
  number: issue.number,
  title: issue.title,
  status: statuses[issue.state],
  body: typeof issue.body === 'string' ? issue.body : '',
  url: issue.url,
  labels: labels(issue.labels),
  assignees: names(issue.assignees, 'login'),
  ...closedAs(issue),
});

// The Issues around this one: its parent, its blockers, its sub-Issues and their tally.
const issueLinks = (issue: CheckedIssue): IssueLinks => ({
  blockedBy: relations(issue.blockedBy),
  children: relations(issue.subIssues),
  progress: progressOf(issue.subIssuesSummary),
  ...parentOf(issue.parent),
});

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
