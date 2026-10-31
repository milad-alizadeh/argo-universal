import type { IssueStatus } from './github-issues';

const listFields =
  'number,title,state,stateReason,labels,assignees,parent,url,blockedBy,subIssuesSummary';

const issueFields = `${listFields},body,subIssues`;

// The most labels a repository's grouping shows.
const labelLimit = '100';

const issueList = ['gh', 'issue', 'list'];

const options = (values: Record<string, string>): string[] =>
  Object.entries(values).flat();

// The gh commands the Tracker runs; plugin.json declares each shape.
export const listCommand = (
  repository: string,
  search: string,
  limit: number,
): string[] => [
  ...issueList,
  ...options({
    '--repo': repository,
    '--state': 'all',
    '--search': search,
    '--limit': String(limit),
    '--json': listFields,
  }),
];

// GitHub's search answers a total; one result is the least it sends with it.
export const countCommand = (repository: string, search: string): string[] => [
  'gh',
  'api',
  '-X',
  'GET',
  'search/issues',
  '-f',
  `q=repo:${repository} is:issue ${search}`,
  '-f',
  'per_page=1',
];

export const labelsCommand = (repository: string): string[] => [
  'gh',
  'label',
  'list',
  '--repo',
  repository,
  '--limit',
  labelLimit,
  '--json',
  'name',
];

export const viewCommand = (repository: string, number: number): string[] => [
  'gh',
  'issue',
  'view',
  issueNumber(number),
  '--repo',
  repository,
  '--json',
  issueFields,
];

const statusCommands = { open: 'reopen', closed: 'close' } as const;

export const statusCommand = (
  repository: string,
  number: number,
  status: IssueStatus,
): string[] => [
  'gh',
  'issue',
  statusCommands[status],
  issueNumber(number),
  '--repo',
  repository,
];

function issueNumber(number: number): string {
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error('Issue number must be a positive integer.');

  return String(number);
}
