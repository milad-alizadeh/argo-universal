import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { commit } from '../test-git.test.mocks';
import { repository, sessionWorktree } from '../test-repository.test.mocks';
import { readFileDiff } from '.';

const sharedFile = 'shared.txt';

async function threeLineCheckout(): Promise<string> {
  const { directory } = await repository(false);

  writeFileSync(join(directory, 'first.txt'), 'one\ntwo\nthree\n');

  return directory;
}

it('pages one file diff by its lines', async () => {
  const directory = await threeLineCheckout();

  const selection = {
    checkout: directory,
    projectCheckout: directory,
    path: 'first.txt',
  };

  const first = await readFileDiff(selection, { limit: 2 });
  const second = await readFileDiff(selection, { cursor: 2, limit: 2 });

  expect([first, second]).toMatchObject([
    {
      nextCursor: 2,
      patch: expect.not.stringContaining('+three'),
    },
    {
      nextCursor: null,
      patch: expect.stringContaining('@@ -0,0 +3,1 @@'),
    },
  ]);
});

it('compares a file against a branch', async () => {
  const { directory, git } = await repository();

  await git('switch', '-q', 'feature');
  writeFileSync(join(directory, sharedFile), 'feature\n');
  await git('add', sharedFile);
  await commit(git, 'Shared feature');
  const checkout = await sessionWorktree(directory, git);

  writeFileSync(join(checkout, sharedFile), 'feature\nlocal\n');

  const diff = await readFileDiff({
    checkout,
    projectCheckout: directory,
    comparison: { branch: 'main' },
    path: sharedFile,
  });

  expect(diff?.file).toMatchObject({ operation: 'add', additions: 2 });
});
