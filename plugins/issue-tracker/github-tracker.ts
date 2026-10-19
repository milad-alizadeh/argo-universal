import type { Argo, ProcessResult } from '@argo/plugin-kit';
import { mapIssue, parseJson, type GitHubJson } from './github-issues';
import type { Issue, TrackerClient } from './issue-types';

const listFields = 'number,title,state,labels,assignees,url';

const issueFields = `${listFields},body`;

const githubErrorMessages: [RegExp, string][] = [
  [/not found|enoent|no such file/i, 'GitHub CLI (gh) is not installed.'],
  [
    /not logged in|not authenticated|authentication failed|run gh auth login/i,
    'Sign in to GitHub with gh auth login.',
  ],
];

// The Tracker reaches GitHub only by running gh.
type GitHub = { process: Pick<Argo['process'], 'run'> };

export const githubError = (cause: unknown): string => {
  const detail = errorDetail(cause);

  return matchingErrorMessage(detail) ?? detail;
};

function errorDetail(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function matchingErrorMessage(detail: string): string | undefined {
  return githubErrorMessages.find(([pattern]) => pattern.test(detail))?.[1];
}

// The Tracker talks to GitHub only through the Server-owned `argo` API.
export function createGitHubTracker(
  argo: GitHub,
  repository: string,
): TrackerClient {
  return {
    authStatus: () => run(argo, ['gh', 'auth', 'status']),
    listIssues: () => listIssues(argo, repository),
    getIssue: (number) => getIssue(argo, repository, number),
  };
}

async function listIssues(argo: GitHub, repository: string): Promise<Issue[]> {
  const [open = '', closed = ''] = await Promise.all(
    ['open', 'closed'].map((state) =>
      run(argo, listCommand(repository, state)),
    ),
  );

  return [
    ...mapIssueList(parseJson(open, 'GitHub open issue list')),
    ...mapIssueList(parseJson(closed, 'GitHub closed issue list')),
  ];
}

const listCommand = (repository: string, state: string): string[] => [
  'gh',
  'issue',
  'list',
  '--repo',
  repository,
  '--state',
  state,
  '--limit',
  '50',
  '--json',
  listFields,
];

function mapIssueList(issues: GitHubJson): Issue[] {
  if (!Array.isArray(issues))
    throw new Error('GitHub returned an invalid Issue list.');

  return issues.map(mapIssue);
}

async function getIssue(
  argo: GitHub,
  repository: string,
  number: number,
): Promise<Issue> {
  const output = await run(argo, viewCommand(repository, number));

  return mapIssue(parseJson(output, 'GitHub Issue'));
}

const viewCommand = (repository: string, number: number): string[] => [
  'gh',
  'issue',
  'view',
  issueNumber(number),
  '--repo',
  repository,
  '--json',
  issueFields,
];

async function run(argo: GitHub, argv: string[]): Promise<string> {
  const result = await argo.process.run(argv);

  rejectIncomplete(argv, result);
  rejectFailure(argv, result);

  return result.stdout;
}

function rejectIncomplete(argv: string[], result: ProcessResult): void {
  if (result.timedOut) throw new Error(`gh ${argv[1]} timed out.`);

  if (result.truncated)
    throw new Error(`gh ${argv[1]} exceeded the output cap.`);
}

function rejectFailure(argv: string[], result: ProcessResult): void {
  if (result.exitCode === 0) return;

  const detail = result.stderr.trim();
  throw new Error(detail || `gh ${argv[1]} exited with ${result.exitCode}.`);
}

function issueNumber(number: number): string {
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error('Issue number must be a positive integer.');

  return String(number);
}
