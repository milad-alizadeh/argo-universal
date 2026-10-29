import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listComparisonBranches, readCheckoutChanges } from '@repo/git';
import { expect, it } from 'vitest';
import {
  commit,
  remoteFeatureRef,
  repository,
  sessionWorktree,
} from './git-changes-fixture';

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

  expect(
    (
      await readCheckoutChanges(checkout, directory, {
        type: 'branch',
        branch: remoteFeatureRef,
      })
    ).files,
  ).toEqual([
    { operation: 'add', path: 'draft.txt', additions: 1, deletions: 0 },
  ]);
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

  expect(
    await readCheckoutChanges(checkout, projectCheckout, { type: 'main' }),
  ).toEqual({
    mainBranch: 'project-linked',
    files: [],
    summary: { files: 0, additions: 0, deletions: 0 },
  });
});
