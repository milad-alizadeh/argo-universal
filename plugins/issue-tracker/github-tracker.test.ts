import type { Argo, ProcessResult } from '@argo/plugin-kit';
import { expect, it } from 'vitest';
import type { GitHubIssue } from './github-issues';
import { githubRepositoryFromOrigin } from './github-repository';
import { createGitHubTracker, githubError } from './github-tracker';
import type { Issue, TrackerClient } from './issue-types';

type Run = Argo['process']['run'];

const repository = 'argo/app';

const issue = (state: string, body = ''): GitHubIssue => ({
  number: 8,
  title: 'Keep the Plugin boundary',
  state,
  body,
  url: `https://github.com/${repository}/issues/8`,
  labels: [{ name: 'security' }],
  assignees: [{ login: 'dev' }],
});

const mappedIssue = (state: string, body = ''): Issue => ({
  number: 8,
  title: 'Keep the Plugin boundary',
  status: state.toLowerCase(),
  body,
  url: `https://github.com/${repository}/issues/8`,
  labels: ['security'],
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

it('maps open and closed Issue list responses independently', async () => {
  const calls: string[][] = [];

  const tracker = trackerFor(async (argv) => {
    calls.push(argv);

    return success(JSON.stringify([issue(String(argv[6]).toUpperCase())]));
  });

  expect(await tracker.listIssues()).toEqual([
    mappedIssue('OPEN'),
    mappedIssue('CLOSED'),
  ]);
  expect(calls.map((argv) => argv[6])).toEqual(['open', 'closed']);
  expect(
    calls.every((argv) => argv[argv.indexOf('--limit') + 1] === '50'),
  ).toBe(true);
});

it('maps the Issue returned by GitHub', async () => {
  const tracker = trackerFor(async () =>
    success(JSON.stringify(issue('CLOSED', 'Use the Server API.'))),
  );

  expect(await tracker.getIssue(8)).toEqual(
    mappedIssue('CLOSED', 'Use the Server API.'),
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

  await expect(tracker.listIssues()).rejects.toThrow('timed out');
});

it('rejects truncated GitHub CLI output', async () => {
  const tracker = trackerFor(async () => ({
    ...success('[]'),
    truncated: true,
  }));

  await expect(tracker.listIssues()).rejects.toThrow('exceeded the output cap');
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
