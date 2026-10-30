import type { Argo, ProcessResult } from '@argo/plugin-kit';
import { expect, it } from 'vitest';
import { githubError } from './github-errors';
import type { GitHubIssue, Issue } from './github-issues';
import {
  createGitHubTracker,
  githubRepositoryFromOrigin,
  type TrackerClient,
} from './github-tracker';

type Run = Argo['process']['run'];

const repository = 'argo/app';

const issue = (state: string, body = ''): GitHubIssue => ({
  number: 8,
  title: 'Keep the Plugin boundary',
  state,
  body,
  url: `https://github.com/${repository}/issues/8`,
  labels: [{ name: 'security', color: 'd73a4a' }, { name: 'docs' }],
  assignees: [{ login: 'dev' }],
});

const mappedIssue = (state: 'OPEN' | 'CLOSED', body = ''): Issue => ({
  number: 8,
  title: 'Keep the Plugin boundary',
  status: state === 'OPEN' ? 'open' : 'closed',
  body,
  url: `https://github.com/${repository}/issues/8`,
  labels: [{ name: 'security', color: '#d73a4a' }, { name: 'docs' }],
  assignees: ['dev'],
});

const success = (stdout = ''): ProcessResult => ({
  exitCode: 0,
  stdout,
  stderr: '',
  truncated: false,
  timedOut: false,
});

const trackerFor = (run: Run): TrackerClient =>
  createGitHubTracker({ process: { run } }, repository);

it('lists one GitHub search across both states, as many as asked', async () => {
  const calls: string[][] = [];

  const tracker = trackerFor(async (argv) => {
    calls.push(argv);

    return success(JSON.stringify([issue('OPEN'), issue('CLOSED')]));
  });

  expect(await tracker.listIssues('is:open label:"bug"', 60)).toEqual([
    mappedIssue('OPEN'),
    mappedIssue('CLOSED'),
  ]);
  expect(calls).toEqual([
    [
      'gh',
      'issue',
      'list',
      '--repo',
      repository,
      '--state',
      'all',
      '--search',
      'is:open label:"bug"',
      '--limit',
      '60',
      '--json',
      'number,title,state,stateReason,labels,assignees,parent,url,blockedBy,subIssuesSummary',
    ],
  ]);
});

it('maps the Issue returned by GitHub', async () => {
  const tracker = trackerFor(async () =>
    success(JSON.stringify(issue('CLOSED', 'Use the Server API.'))),
  );

  expect(await tracker.getIssue(8)).toEqual(
    mappedIssue('CLOSED', 'Use the Server API.'),
  );
});

it.each([
  ['closed', 'close'],
  ['open', 'reopen'],
] as const)('sets an Issue %s with gh issue %s', async (status, command) => {
  const calls: string[][] = [];

  const tracker = trackerFor(async (argv) => {
    calls.push(argv);

    return success();
  });

  await tracker.setStatus(8, status);

  expect(calls).toEqual([['gh', 'issue', command, '8', '--repo', repository]]);
});

it('rejects a status change gh refuses', async () => {
  const tracker = trackerFor(async () => ({
    ...success(),
    exitCode: 1,
    stderr: 'GraphQL: Could not close the issue.',
  }));

  await expect(tracker.setStatus(8, 'closed')).rejects.toThrow(
    'Could not close the issue.',
  );
});

it('rejects an invalid Issue number before running gh', async () => {
  let called = false;

  const tracker = trackerFor(async () => {
    called = true;

    return success();
  });

  await expect(tracker.getIssue(0)).rejects.toThrow(
    'Issue number must be a positive integer.',
  );
  expect(called).toBe(false);
});

it.each([
  ['git@github.com:owner/repository.git', 'owner/repository'],
  ['https://GITHUB.com/team/project.git/', 'team/project'],
  ['ssh://git@github.com/team/project.git', 'team/project'],
  ['https://gitlab.com/team/project.git', null],
  ['https://github.com/--help/project.git', null],
  ['https://github.com/team/project.git?query=1', null],
])('maps Project origin %s to GitHub repository %s', (origin, expected) => {
  expect(githubRepositoryFromOrigin(origin)).toBe(expected);
});

it('rejects timed out GitHub CLI output', async () => {
  const tracker = trackerFor(async () => ({
    ...success('[]'),
    timedOut: true,
  }));

  await expect(tracker.listIssues('is:open', 30)).rejects.toThrow('timed out');
});

it('rejects truncated GitHub CLI output', async () => {
  const tracker = trackerFor(async () => ({
    ...success('[]'),
    truncated: true,
  }));

  await expect(tracker.listIssues('is:open', 30)).rejects.toThrow(
    'exceeded the output cap',
  );
});

it.each([
  ['gh: command not found', 'GitHub CLI (gh) is not installed.'],
  [
    'You are not logged into any GitHub hosts. Run gh auth login to authenticate.',
    'Sign in to GitHub with gh auth login.',
  ],
  ['The token is expired', 'The token is expired'],
])('shows a targeted GitHub CLI message for %s', (detail, expected) => {
  expect(githubError(new Error(detail))).toBe(expected);
});
