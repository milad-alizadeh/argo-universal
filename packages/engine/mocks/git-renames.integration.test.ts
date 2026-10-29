import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCheckoutChanges, readCheckoutDiff } from '@repo/git';
import { expect, it } from 'vitest';
import { commit, repository, sessionWorktree } from './git-changes-fixture';

async function renamedCheckout(): Promise<{
  directory: string;
  checkout: string;
}> {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'old.txt'), 'keep\n');
  await git('add', 'old.txt');
  await commit(git, 'Old file');
  const checkout = await sessionWorktree(directory, git, 'main');

  await git('-C', checkout, 'mv', 'old.txt', 'new.txt');

  return { directory, checkout };
}

it('identifies a renamed file and its previous path', async () => {
  const { directory, checkout } = await renamedCheckout();

  expect(
    (await readCheckoutChanges(checkout, directory, { type: 'uncommitted' }))
      .files,
  ).toEqual([
    {
      operation: 'move',
      path: 'new.txt',
      oldPath: 'old.txt',
      additions: 0,
      deletions: 0,
    },
  ]);
});

it('returns a unified patch for a renamed file', async () => {
  const { directory, checkout } = await renamedCheckout();

  const diff = await readCheckoutDiff(
    checkout,
    directory,
    { type: 'uncommitted' },
    'new.txt',
  );

  expect(diff?.patch).toContain('rename to new.txt');
});

it('refuses a path outside the changed file list', async () => {
  const { directory, checkout } = await renamedCheckout();

  expect(
    await readCheckoutDiff(
      checkout,
      directory,
      { type: 'uncommitted' },
      '../old.txt',
    ),
  ).toBeNull();
});
