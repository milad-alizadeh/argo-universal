import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  commit,
  remoteFeatureRef,
  repository,
  sessionWorktree,
} from '../test-repository.test.mocks';
import { listComparisonBranches, readChangedFiles } from '.';

async function remoteCheckout(): Promise<{
  directory: string;
  checkout: string;
}> {
  const { directory, git } = await repository();

  await git('update-ref', remoteFeatureRef, 'refs/heads/feature');
  await git('symbolic-ref', 'refs/remotes/origin/HEAD', remoteFeatureRef);

  return { directory, checkout: await sessionWorktree(directory, git) };
}

it('lists local and remote-tracking branches with distinct refs', async () => {
  const { checkout } = await remoteCheckout();

  expect(await listComparisonBranches(checkout)).toEqual([
    { name: 'argo/session-1', ref: 'refs/heads/argo/session-1' },
    { name: 'feature', ref: 'refs/heads/feature' },
    { name: 'main', ref: 'refs/heads/main' },
    { name: 'origin/feature', ref: remoteFeatureRef },
  ]);
});

it('compares against a remote-tracking branch ref', async () => {
  const { directory, checkout } = await remoteCheckout();

  writeFileSync(join(checkout, 'draft.txt'), 'draft\n');

  const { files } = await readChangedFiles({
    checkout,
    projectCheckout: directory,
    comparison: { branch: remoteFeatureRef },
  });

  expect(files).toEqual([
    { operation: 'add', path: 'draft.txt', additions: 1, deletions: 0 },
  ]);
});

it('compares against a local branch by its name', async () => {
  const { directory, checkout } = await remoteCheckout();

  const { files } = await readChangedFiles({
    checkout,
    projectCheckout: directory,
    comparison: { branch: 'main' },
  });

  expect(files).toEqual([]);
});

it('uses a linked Project Checkout as the main comparison', async () => {
  const { directory, git } = await repository();

  await git('switch', '-q', 'feature');
  writeFileSync(join(directory, 'shared.txt'), 'feature\n');
  await git('add', 'shared.txt');
  await commit(git, 'Shared feature');
  await git('switch', '-q', 'main');
  const projectCheckout = join(directory, 'project');

  await git(
    'worktree',
    'add',
    '-q',
    '-b',
    'project-linked',
    projectCheckout,
    'feature',
  );
  const checkout = await sessionWorktree(directory, git);

  expect(await readChangedFiles({ checkout, projectCheckout })).toEqual({
    mainBranch: 'project-linked',
    files: [],
    summary: { files: 0, additions: 0, deletions: 0 },
    nextCursor: null,
  });
});
