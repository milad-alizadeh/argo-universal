import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listComparisonBranches,
  readCheckoutChanges,
  readCheckoutDiff,
} from '@repo/git';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { expect, it, onTestFinished } from 'vitest';

const sessionBranch = 'argo/session-1';

const remoteFeatureRef = 'refs/remotes/origin/feature';

type Git = Awaited<ReturnType<typeof initTestRepository>>;

async function repository(feature = true): Promise<{
  directory: string;
  git: Git;
}> {
  const directory = mkdtempSync(join(tmpdir(), 'argo-changes-'));

  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));

  return { directory, git: await initTestRepository(directory, feature) };
}

async function sessionWorktree(
  directory: string,
  git: Git,
  base = 'feature',
): Promise<string> {
  const checkout = join(directory, 'session');

  await git('worktree', 'add', '-q', '-b', sessionBranch, checkout, base);

  return checkout;
}

async function commit(git: Git, message: string): Promise<void> {
  await git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.com',
    'commit',
    '-q',
    '-m',
    message,
  );
}

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
  execFileSync('git', ['init', '-q'], { cwd: nested });
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
      await readCheckoutDiff(
        directory,
        directory,
        { type: 'uncommitted' },
        'kept.txt',
      )
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
