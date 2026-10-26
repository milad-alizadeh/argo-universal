import type { Argo, ProcessResult } from '@argo/plugin-kit';
import {
  countCommand,
  labelsCommand,
  listCommand,
  statusCommand,
  viewCommand,
} from './github-commands';
import {
  mapCount,
  mapIssue,
  mapLabels,
  parseJson,
  type GitHubCount,
  type GitHubIssue,
  type GitHubLabel,
  type Issue,
  type IssueStatus,
} from './github-issues';

// Each list and count is a GitHub search, as `is:open label:bug`.
export type TrackerClient = {
  authStatus: () => Promise<string>;
  listIssues: (search: string, limit: number) => Promise<Issue[]>;
  countIssues: (search: string) => Promise<number>;
  listLabels: () => Promise<string[]>;
  getIssue: (number: number) => Promise<Issue>;
  setStatus: (number: number, status: IssueStatus) => Promise<void>;
};

type GitHub = { process: Pick<Argo['process'], 'run'> };

type Read = <Reply>(
  argv: string[],
  description: string,
) => Promise<Reply | null>;

// The Tracker talks to GitHub only through the Server-owned `argo` API.
export function createGitHubTracker(
  argo: GitHub,
  repository: string,
): TrackerClient {
  const read: Read = async (argv, description) =>
    parseJson(await run(argo, argv), description);

  return {
    authStatus: () => run(argo, ['gh', 'auth', 'status']),
    ...searches(read, repository),
    ...issueCalls(argo, read, repository),
  };
}

type Searches = Pick<
  TrackerClient,
  'listIssues' | 'countIssues' | 'listLabels'
>;

const searches = (read: Read, repository: string): Searches => ({
  listIssues: async (search, limit) =>
    mapIssueList(
      await read(listCommand(repository, search, limit), 'GitHub Issue list'),
    ),
  countIssues: async (search) =>
    mapCount(
      await read<GitHubCount>(countCommand(repository, search), 'GitHub count'),
    ),
  listLabels: async () =>
    mapLabels(
      await read<GitHubLabel[]>(labelsCommand(repository), 'GitHub label list'),
    ),
});

type IssueCalls = Pick<TrackerClient, 'getIssue' | 'setStatus'>;

const issueCalls = (
  argo: GitHub,
  read: Read,
  repository: string,
): IssueCalls => ({
  getIssue: async (number) =>
    mapIssue(
      await read<GitHubIssue>(viewCommand(repository, number), 'GitHub Issue'),
    ),
  setStatus: async (number, status) => {
    await run(argo, statusCommand(repository, number, status));
  },
});

function mapIssueList(issues: GitHubIssue[] | null): Issue[] {
  if (!Array.isArray(issues))
    throw new Error('GitHub returned an invalid Issue list.');

  return issues.map((issue) => mapIssue(issue));
}

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

export function githubRepositoryFromOrigin(
  originUrl: string | null | undefined,
): string | null {
  if (typeof originUrl !== 'string') return null;

  return githubRepositoryFromMatch(originUrl);
}

function githubRepositoryFromMatch(originUrl: string): string | null {
  const match =
    /^(?:git@github\.com:|https:\/\/github\.com\/|ssh:\/\/(?:git@)?github\.com\/)([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?$/i.exec(
      originUrl,
    );

  const [, owner, name] = match ?? [];

  return validRepositoryParts(owner, name);
}

function validRepositoryParts(
  owner: string | undefined,
  name: string | undefined,
): string | null {
  if (hasInvalidRepositoryParts(owner, name)) return null;

  return `${owner}/${name}`;
}

function hasInvalidRepositoryParts(
  owner: string | undefined,
  name: string | undefined,
): boolean {
  const validOwner = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(
    owner ?? '',
  );

  const validName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name ?? '');

  return ![owner, name, validOwner, validName].every(Boolean);
}
