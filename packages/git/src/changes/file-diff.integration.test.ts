import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  commit,
  gitIn,
  repository,
  sessionWorktree,
} from '../test-repository.test.mocks';
import { readFileDiff } from '.';

async function renamedCheckout(): Promise<{
  directory: string;
  checkout: string;
}> {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'old.txt'), 'keep\n');
  await git('add', 'old.txt');
  await commit(git, 'Old file');
  const checkout = await sessionWorktree(directory, git, 'main');

  await gitIn(checkout)('mv', 'old.txt', 'new.txt');

  return { directory, checkout };
}

it('returns a unified patch for a renamed file', async () => {
  const { directory, checkout } = await renamedCheckout();

  const diff = await readFileDiff({
    checkout,
    projectCheckout: directory,
    comparison: 'uncommitted',
    path: 'new.txt',
  });

  expect(diff).toMatchObject({
    file: { operation: 'move', path: 'new.txt', oldPath: 'old.txt' },
    patch: expect.stringContaining('rename to new.txt'),
  });
});

it('pairs a rename that also changed lines with its counts', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'old.txt'), 'one\ntwo\nthree\nfour\n');
  await git('add', 'old.txt');
  await commit(git, 'Old file');
  const checkout = await sessionWorktree(directory, git, 'main');
  const session = gitIn(checkout);

  await session('mv', 'old.txt', 'new.txt');
  writeFileSync(join(checkout, 'new.txt'), 'one\ntwo\nthree\nfour\nfive\n');

  const diff = await readFileDiff({
    checkout,
    projectCheckout: directory,
    comparison: 'uncommitted',
    path: 'new.txt',
  });

  expect(diff?.file).toEqual({
    operation: 'move',
    path: 'new.txt',
    oldPath: 'old.txt',
    additions: 1,
    deletions: 0,
  });
});

it.each(['../old.txt', '/etc/hosts', 'a/../../old.txt', 'unknown.txt'])(
  'finds no changed file at %s',
  async (path) => {
    const { directory, checkout } = await renamedCheckout();

    expect(
      await readFileDiff({
        checkout,
        projectCheckout: directory,
        comparison: 'uncommitted',
        path,
      }),
    ).toBeNull();
  },
);
