import type { Argo, ProcessResult } from '@argo/plugin-kit';
import { expect, it } from 'vitest';
import { createGitHubTracker, type TrackerClient } from './github-tracker';

const repository = 'argo/app';

const success = (stdout: string): ProcessResult => ({
  exitCode: 0,
  stdout,
  stderr: '',
  truncated: false,
  timedOut: false,
});

const trackerFor = (run: Argo['process']['run']): TrackerClient =>
  createGitHubTracker({ process: { run } }, repository);

it("counts a search's Issues in the repository from GitHub's total", async () => {
  const calls: string[][] = [];

  const tracker = trackerFor(async (argv) => {
    calls.push(argv);

    return success(JSON.stringify({ total_count: 12, items: [] }));
  });

  expect(await tracker.countIssues('is:open')).toBe(12);
  expect(calls[0]).toContain(`q=repo:${repository} is:issue is:open`);
});

it('lists the repository label names', async () => {
  const tracker = trackerFor(async () =>
    success(JSON.stringify([{ name: 'bug' }, { name: 'good first issue' }])),
  );

  expect(await tracker.listLabels()).toEqual(['bug', 'good first issue']);
});

it('rejects a count GitHub does not report', async () => {
  const tracker = trackerFor(async () => success('{"items":[]}'));

  await expect(tracker.countIssues('is:open')).rejects.toThrow(
    'GitHub returned an invalid count.',
  );
});
