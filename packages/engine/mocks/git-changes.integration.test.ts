import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCheckoutChanges, readCheckoutDiff } from '@repo/git';
import { expect, it } from 'vitest';
import { commit, repository, sessionWorktree } from './git-changes-fixture';

it('uses the main Checkout branch merge-base and includes untracked files', async () => {
  const { directory, git } = await repository();

  await git('branch', '-m', 'main', 'trunk');
  const checkout = await sessionWorktree(directory, git);

  writeFileSync(join(checkout, 'draft.txt'), 'first\nsecond\n');

  const result = await readCheckoutChanges(checkout, directory, {
    type: 'main',
  });

  expect(result).toEqual({
    mainBranch: 'trunk',
    files: [
      { operation: 'add', path: 'draft.txt', additions: 2, deletions: 0 },
    ],
    summary: { files: 1, additions: 2, deletions: 0 },
  });
});

it('keeps other changed files readable beside an untracked nested repository', async () => {
  const { directory } = await repository(false);
  const nested = join(directory, 'nested');

  mkdirSync(nested);
  execFileSync('/usr/bin/git', ['init', '-q'], { cwd: nested });
  writeFileSync(join(nested, 'file.txt'), 'nested\n');
  writeFileSync(join(directory, 'draft.txt'), 'draft\n');

  expect(
    (await readCheckoutChanges(directory, directory, { type: 'main' })).files,
  ).toEqual([
    { operation: 'add', path: 'draft.txt', additions: 1, deletions: 0 },
  ]);
});

it('shows the working file once when it was removed from the index', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'kept.txt'), 'kept\n');
  await git('add', 'kept.txt');
  await commit(git, 'Tracked file');
  await git('rm', '--cached', '-q', 'kept.txt');

  const changes = await readCheckoutChanges(directory, directory, {
    type: 'uncommitted',
  });

  expect(changes.files).toEqual([
    { operation: 'add', path: 'kept.txt', additions: 1, deletions: 0 },
  ]);
  expect(changes.summary.files).toBe(1);
  expect(
    (
      await readCheckoutDiff(directory, directory, {
        comparison: { type: 'uncommitted' },
        path: 'kept.txt',
      })
    )?.patch,
  ).toContain('+kept');
});

it.each([
  {
    comparison: { type: 'main' as const },
    operation: 'add',
    additions: 3,
  },
  {
    comparison: { type: 'uncommitted' as const },
    operation: 'modify',
    additions: 2,
  },
])(
  'counts committed, staged, and unstaged lines for $comparison.type',
  async ({ comparison, operation, additions }) => {
    const { directory, git } = await repository();
    const checkout = await sessionWorktree(directory, git);

    writeFileSync(join(checkout, 'notes.txt'), 'committed\n');
    await git('-C', checkout, 'add', 'notes.txt');
    await git(
      '-C',
      checkout,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '-q',
      '-m',
      'Notes',
    );
    writeFileSync(join(checkout, 'notes.txt'), 'committed\nstaged\n');
    await git('-C', checkout, 'add', 'notes.txt');
    writeFileSync(join(checkout, 'notes.txt'), 'committed\nstaged\nunstaged\n');

    expect(
      (await readCheckoutChanges(checkout, directory, comparison)).files,
    ).toEqual([{ operation, path: 'notes.txt', additions, deletions: 0 }]);
  },
);

it('reports binary file counts as null', async () => {
  const { directory, git } = await repository(false);

  writeFileSync(join(directory, 'image.bin'), Buffer.from([0, 1, 2]));
  await git('add', 'image.bin');
  await commit(git, 'Binary');
  const checkout = await sessionWorktree(directory, git, 'main');

  writeFileSync(join(checkout, 'image.bin'), Buffer.from([0, 1, 3]));

  expect(
    (await readCheckoutChanges(checkout, directory, { type: 'uncommitted' }))
      .files,
  ).toEqual([
    {
      operation: 'modify',
      path: 'image.bin',
      additions: null,
      deletions: null,
    },
  ]);
});
