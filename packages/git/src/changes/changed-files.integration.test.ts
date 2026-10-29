import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { commit, gitIn } from '../test-git.test.mocks';
import { repository, sessionWorktree } from '../test-repository.test.mocks';
import { readChangedFiles } from '.';

it('uses the main Checkout branch merge-base and includes untracked files', async () => {
  const { directory, git } = await repository();

  await git('branch', '-m', 'main', 'trunk');
  const checkout = await sessionWorktree(directory, git);

  writeFileSync(join(checkout, 'draft.txt'), 'first\nsecond\n');

  expect(
    await readChangedFiles({ checkout, projectCheckout: directory }),
  ).toEqual({
    mainBranch: 'trunk',
    files: [
      { operation: 'add', path: 'draft.txt', additions: 2, deletions: 0 },
    ],
    summary: { files: 1, additions: 2, deletions: 0 },
    nextCursor: null,
  });
});

it('keeps other changed files readable beside an untracked nested repository', async () => {
  const { directory } = await repository(false);
  const nested = join(directory, 'nested');

  mkdirSync(nested);
  await gitIn(nested)('init', '-q');
  writeFileSync(join(nested, 'file.txt'), 'nested\n');
  writeFileSync(join(directory, 'draft.txt'), 'draft\n');

  const { files } = await readChangedFiles({
    checkout: directory,
    projectCheckout: directory,
  });

  expect(files).toEqual([
    { operation: 'add', path: 'draft.txt', additions: 1, deletions: 0 },
  ]);
});

it('shows the working file once when it was removed from the index', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'kept.txt'), 'kept\n');
  await git('add', 'kept.txt');
  await commit(git, 'Tracked file');
  await git('rm', '--cached', '-q', 'kept.txt');

  const changes = await readChangedFiles({
    checkout: directory,
    projectCheckout: directory,
    comparison: 'uncommitted',
  });

  expect(changes.files).toEqual([
    { operation: 'add', path: 'kept.txt', additions: 1, deletions: 0 },
  ]);
  expect(changes.summary.files).toBe(1);
});

it('lists a deleted file beside an untracked file that is not its path', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'gone.txt'), 'gone\n');
  await git('add', 'gone.txt');
  await commit(git, 'Tracked file');
  rmSync(join(directory, 'gone.txt'));
  writeFileSync(join(directory, 'gone.txt.bak'), 'copy\n');

  const { files } = await readChangedFiles({
    checkout: directory,
    projectCheckout: directory,
    comparison: 'uncommitted',
  });

  expect(files).toEqual([
    { operation: 'delete', path: 'gone.txt', additions: 0, deletions: 1 },
    { operation: 'add', path: 'gone.txt.bak', additions: 1, deletions: 0 },
  ]);
});

it.each([
  { comparison: 'main' as const, operation: 'add', additions: 3 },
  { comparison: 'uncommitted' as const, operation: 'modify', additions: 2 },
])(
  'counts committed, staged, and unstaged lines for $comparison',
  async ({ comparison, operation, additions }) => {
    const { directory, git } = await repository();
    const checkout = await sessionWorktree(directory, git);

    writeFileSync(join(checkout, 'notes.txt'), 'committed\n');
    const session = gitIn(checkout);

    await session('add', 'notes.txt');
    await commit(session, 'Notes');
    writeFileSync(join(checkout, 'notes.txt'), 'committed\nstaged\n');
    await session('add', 'notes.txt');
    writeFileSync(join(checkout, 'notes.txt'), 'committed\nstaged\nunstaged\n');

    const changes = await readChangedFiles({
      checkout,
      projectCheckout: directory,
      comparison,
    });

    expect(changes.files).toEqual([
      { operation, path: 'notes.txt', additions, deletions: 0 },
    ]);
  },
);
