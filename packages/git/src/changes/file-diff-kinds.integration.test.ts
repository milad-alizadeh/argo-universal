import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { commit } from '../test-git.test.mocks';
import { repository } from '../test-repository.test.mocks';
import { readFileDiff } from '.';

it('reads a path as a name, never as a glob or pathspec magic', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'a.txt'), 'a\n');
  writeFileSync(join(directory, 'b.txt'), 'b\n');
  await git('add', '.');
  await commit(git, 'Two files');
  writeFileSync(join(directory, 'a.txt'), 'a\nchanged\n');

  const selection = {
    checkout: directory,
    projectCheckout: directory,
    comparison: 'uncommitted' as const,
  };

  expect(
    await Promise.all(
      ['*.txt', ':(top)a.txt', ':!a.txt', 'a.tx[t]'].map((path) =>
        readFileDiff({ ...selection, path }),
      ),
    ),
  ).toEqual([null, null, null, null]);
});

it('reads a file whose name is a glob', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, '*.txt'), 'star\n');
  writeFileSync(join(directory, 'other.txt'), 'other\n');
  await git('add', '.');
  await commit(git, 'Files');
  writeFileSync(join(directory, '*.txt'), 'star\nmore\n');
  writeFileSync(join(directory, 'other.txt'), 'other\nmore\n');

  const diff = await readFileDiff({
    checkout: directory,
    projectCheckout: directory,
    comparison: 'uncommitted',
    path: '*.txt',
  });

  expect(diff?.patch).toContain('+more');
  expect(diff?.patch).not.toContain('other.txt');
});

it('shows the working file when it was removed from the index', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'kept.txt'), 'kept\n');
  await git('add', 'kept.txt');
  await commit(git, 'Tracked file');
  await git('rm', '--cached', '-q', 'kept.txt');

  const diff = await readFileDiff({
    checkout: directory,
    projectCheckout: directory,
    comparison: 'uncommitted',
    path: 'kept.txt',
  });

  expect(diff).toMatchObject({
    file: { operation: 'add', path: 'kept.txt' },
    patch: expect.stringContaining('+kept'),
  });
});

it('returns the patch of an untracked file in a new directory', async () => {
  const { directory } = await repository(false);

  mkdirSync(join(directory, 'docs'));
  writeFileSync(join(directory, 'docs', 'new.txt'), 'fresh\n');

  const diff = await readFileDiff({
    checkout: directory,
    projectCheckout: directory,
    path: 'docs/new.txt',
  });

  expect(diff).toMatchObject({
    file: { operation: 'add', path: 'docs/new.txt', additions: 1 },
    patch: expect.stringContaining('+fresh'),
  });
});

it('returns the patch of a deleted file', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'gone.txt'), 'gone\n');
  await git('add', 'gone.txt');
  await commit(git, 'Tracked file');
  rmSync(join(directory, 'gone.txt'));

  const diff = await readFileDiff({
    checkout: directory,
    projectCheckout: directory,
    comparison: 'uncommitted',
    path: 'gone.txt',
  });

  expect(diff).toMatchObject({
    file: { operation: 'delete', deletions: 1 },
    patch: expect.stringContaining('-gone'),
  });
});
