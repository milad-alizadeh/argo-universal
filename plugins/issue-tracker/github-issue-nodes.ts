// Issue 43 is a sub-Issue of 42 and blocked by it. GitHub refuses to change issue 43's status. Closed searches find nothing.
export const parentNumber = 42;

export const childNumber = 43;

const url = (number: number): string =>
  `https://github.com/owner/repository/issues/${number}`;

type Relation = { number: number; title: string; state: 'OPEN'; url: string };

const relation = (number: number, title: string): Relation => ({
  number,
  title,
  state: 'OPEN',
  url: url(number),
});

const parentTitle = 'Fixture issue from GitHub';

export const refusedTitle = 'Fixture issue GitHub cannot change';

type Links = {
  parent: { number: number } | null;
  blockedBy: Relation[];
  subIssues: Relation[];
};

type IssueNode = {
  number: number;
  title: string;
  state: 'OPEN';
  stateReason: null;
  url: string;
  labels: { nodes: { name: string; color: string }[] };
  assignees: { nodes: { login: string }[] };
  parent: Links['parent'];
  blockedBy: { nodes: Relation[] };
  subIssues: { nodes: Relation[] };
  subIssuesSummary: { completed: number; total: number };
  body: string;
};

const labels = { nodes: [{ name: 'fixture', color: 'd73a4a' }] };

const assignees = { nodes: [{ login: 'octocat' }] };

const connections = ({
  parent,
  blockedBy,
  subIssues,
}: Links): Pick<
  IssueNode,
  'parent' | 'blockedBy' | 'subIssues' | 'subIssuesSummary'
> => ({
  parent,
  blockedBy: { nodes: blockedBy },
  subIssues: { nodes: subIssues },
  subIssuesSummary: { completed: 0, total: subIssues.length },
});

const issue = (number: number, title: string, links: Links): IssueNode => ({
  number,
  title,
  state: 'OPEN',
  stateReason: null,
  url: url(number),
  labels,
  assignees,
  ...connections(links),
  body: 'This Issue came from the fixture GitHub.',
});

export const parentIssue = (): IssueNode =>
  issue(parentNumber, parentTitle, {
    parent: null,
    blockedBy: [],
    subIssues: [relation(childNumber, refusedTitle)],
  });

export const childIssue = (): IssueNode =>
  issue(childNumber, refusedTitle, {
    parent: { number: parentNumber },
    blockedBy: [relation(parentNumber, parentTitle)],
    subIssues: [],
  });
