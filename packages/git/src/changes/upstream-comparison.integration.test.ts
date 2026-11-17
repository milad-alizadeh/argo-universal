import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { commit, gitIn, type TestGit } from '../test-git.test.mocks';
import { repository, sessionWorktree } from '../test-repository.test.mocks';
import { readChangedFiles } from '.';

const upstreamRef = 'refs/remotes/team/trunk';

const upstreamPath = 'upstream.txt';

type UpstreamHistory = { directory: string; git: TestGit };

type ComparisonCheckout = UpstreamHistory & { checkout: string };

async function createUpstreamWork({
  directory,
  git,
}: UpstreamHistory): Promise<void> {
  await git('switch', '-q', '-c', 'upstream-tip');
  writeFileSync(join(directory, upstreamPath), 'upstream work\n');
  await git('add', upstreamPath);
  await commit(git, 'Upstream work');
  await git('update-ref', upstreamRef, 'HEAD');
  await git('switch', '-q', 'main');
}

async function upstreamHistory(): Promise<UpstreamHistory> {
  const history = await repository(false);

  await history.git('remote', 'add', 'team', history.directory);
  await createUpstreamWork(history);
  await history.git('config', 'branch.main.remote', 'team');
  await history.git('config', 'branch.main.merge', 'refs/heads/trunk');

  return history;
}

async function mergeUpstream(session: TestGit): Promise<void> {
  await session(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.com',
    'merge',
    '--no-edit',
    upstreamRef,
  );
}

async function mergedCheckout(): Promise<ComparisonCheckout> {
  const history = await upstreamHistory();

  const checkout = await sessionWorktree(
    history.directory,
    history.git,
    'main',
  );

  const session = gitIn(checkout);

  writeFileSync(join(checkout, 'own.txt'), 'Session work\n');
  await session('add', 'own.txt');
  await commit(session, 'Session work');
  await mergeUpstream(session);

  return { ...history, checkout };
}

it('excludes merged upstream work when the main Checkout branch is behind', async () => {
  const { directory, checkout } = await mergedCheckout();

  writeFileSync(join(checkout, 'draft.txt'), 'uncommitted work\n');

  const selection = { checkout, projectCheckout: directory };
  const local = await readChangedFiles(selection);

  const remote = await readChangedFiles({
    ...selection,
    comparison: { branch: upstreamRef },
  });

  expect(local.mainBranch).toBe('team/trunk');
  expect(local.files).toEqual([
    { operation: 'add', path: 'draft.txt', additions: 1, deletions: 0 },
    { operation: 'add', path: 'own.txt', additions: 1, deletions: 0 },
  ]);
  expect(local.summary).toEqual({ files: 2, additions: 2, deletions: 0 });
  expect(local.files).toEqual(remote.files);
});

it('keeps an explicitly selected local branch as the comparison', async () => {
  const { directory, checkout } = await mergedCheckout();

  const changes = await readChangedFiles({
    checkout,
    projectCheckout: directory,
    comparison: { branch: 'main' },
  });

  expect(changes.files).toEqual([
    { operation: 'add', path: 'own.txt', additions: 1, deletions: 0 },
    { operation: 'add', path: upstreamPath, additions: 1, deletions: 0 },
  ]);
});

it('falls back to the local branch when its upstream ref is unavailable', async () => {
  const { directory, git } = await upstreamHistory();
  const checkout = await sessionWorktree(directory, git, 'main');

  await git('update-ref', '-d', upstreamRef);
  writeFileSync(join(checkout, 'draft.txt'), 'uncommitted work\n');

  const changes = await readChangedFiles({
    checkout,
    projectCheckout: directory,
  });

  expect(changes.mainBranch).toBe('main');
  expect(changes.summary).toEqual({ files: 1, additions: 1, deletions: 0 });
});
