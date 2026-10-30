import {
  statuses,
  validIssue,
  type GitHubIssue,
  type IssueStatus,
} from './github-issue-shape';

// Another Issue this one points at: a blocker, or a sub-Issue.
export type IssueRelation = {
  number: number;
  title: string;
  status: IssueStatus;
  url: string;
};

// How many of an Issue's sub-Issues are closed, as GitHub counts them.
export type IssueProgress = { completed: number; total: number };

// GitHub answers a relation as a connection: the Issues it reached, closed ones included.
export type GitHubRelations = { nodes?: (GitHubIssue | null)[] };

// gh prints whatever the API sent, so the tally is checked before it is counted.
export type GitHubSummary = { completed?: unknown; total?: unknown };

// An empty relation reads as none at all, so the page draws nothing for it.
export function relations(
  connection: GitHubRelations | null | undefined,
): IssueRelation[] | undefined {
  return connection ? named(connection.nodes ?? []) : undefined;
}

// Only the Issues GitHub named are shown; a node it did not fill is left out.
const named = (nodes: (GitHubIssue | null)[]): IssueRelation[] | undefined => {
  const found = nodes.flatMap((node) => relationOf(node));

  return found.length === 0 ? undefined : found;
};

function relationOf(node: GitHubIssue | null): IssueRelation[] {
  if (!validIssue(node)) return [];

  return [
    {
      number: node.number,
      title: node.title,
      status: statuses[node.state],
      url: node.url,
    },
  ];
}

// GitHub counts the sub-Issues itself, so the page never adds them up.
export function progressOf(
  summary: GitHubSummary | null | undefined,
): IssueProgress | undefined {
  return summary ? tally(summary) : undefined;
}

// A tally GitHub counted as none means no sub-Issues at all.
function tally(summary: GitHubSummary): IssueProgress | undefined {
  const total = isCount(summary.total) ? summary.total : 0;

  return total === 0
    ? undefined
    : { completed: completedOf(summary, total), total };
}

const completedOf = ({ completed }: GitHubSummary, total: number): number =>
  isCount(completed) ? Math.min(completed, total) : 0;

const isCount = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
