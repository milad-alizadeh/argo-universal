import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { commit, gitIn } from '../test-git.test.mocks';
import { repository, sessionWorktree } from '../test-repository.test.mocks';
import { readChangedFiles } from '.';

it('reports binary file counts as null', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'image.bin'), Buffer.from([0, 1, 2]));
  await git('add', 'image.bin');
  await commit(git, 'Binary');
  const checkout = await sessionWorktree(directory, git, 'main');

  writeFileSync(join(checkout, 'image.bin'), Buffer.from([0, 1, 3]));

  const { files } = await readChangedFiles({
    checkout,
    projectCheckout: directory,
    comparison: 'uncommitted',
  });

  expect(files).toEqual([
    {
      operation: 'modify',
      path: 'image.bin',
      additions: null,
      deletions: null,
    },
  ]);
});

it('identifies a renamed file and its previous path', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'old.txt'), 'keep\n');
  await git('add', 'old.txt');
  await commit(git, 'Old file');
  const checkout = await sessionWorktree(directory, git, 'main');

  await gitIn(checkout)('mv', 'old.txt', 'new.txt');

  const { files } = await readChangedFiles({
    checkout,
    projectCheckout: directory,
    comparison: 'uncommitted',
  });

  expect(files).toEqual([
    {
      operation: 'move',
      path: 'new.txt',
      oldPath: 'old.txt',
      additions: 0,
      deletions: 0,
    },
  ]);
});

it('rejects a comparison against a branch that does not exist', async () => {
  const { directory } = await repository();

  await expect(
    readChangedFiles({
      checkout: directory,
      projectCheckout: directory,
      comparison: { branch: 'missing' },
    }),
  ).rejects.toThrow('No branch missing');
});

it('rejects the main comparison when the Project Checkout has no branch', async () => {
  const { directory, git } = await repository();

  await git('switch', '-q', '--detach', 'main');

  await expect(
    readChangedFiles({ checkout: directory, projectCheckout: directory }),
  ).rejects.toThrow('The main Checkout has no branch');
});
