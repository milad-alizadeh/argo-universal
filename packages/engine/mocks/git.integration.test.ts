import {
  existsSync,
  type FSWatcher,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  watch,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createCheckout,
  discardCheckout,
  isSessionBranch,
  readRepository,
  sessionBranch,
} from '@repo/git';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { expect, it, onTestFinished } from 'vitest';

const occupiedBranch = 'argo/occupied';

it('reads the repository root and common directory from a nested path', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'repository-read-\n')),
  );
  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  initTestRepository(directory);
  const nested = join(directory, 'nested folder');
  mkdirSync(nested);
  expect(await readRepository(nested)).toEqual({
    root: directory,
    commonDirectory: join(directory, '.git'),
  });
});

it('names a Session branch with its stored prefix', (): void => {
  expect(sessionBranch('session-1')).toBe('argo/session-1');
});

it.each([
  { branch: 'argo/session-1', sessionId: 'session-1', expected: true },
  { branch: 'argo/session-2', sessionId: 'session-1', expected: false },
  { branch: 'feature/session-1', sessionId: 'session-1', expected: false },
  { branch: null, sessionId: 'session-1', expected: false },
])(
  'recognises $branch as the Session branch: $expected',
  ({ branch, sessionId, expected }): void => {
    expect(isSessionBranch(branch, sessionId)).toBe(expected);
  },
);

it('reads a linked worktree through its nested directory alias', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'repository-worktree-')),
  );
  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const root = join(directory, 'repository');
  mkdirSync(root);
  const git = initTestRepository(root);
  const worktree = join(directory, 'linked checkout');
  git('worktree', 'add', '-q', '-b', 'linked', worktree, 'main');
  const nested = join(worktree, 'nested folder');
  mkdirSync(nested);
  const alias = join(directory, 'alias');
  symlinkSync(nested, alias, 'dir');
  expect(await readRepository(alias)).toEqual({
    root: worktree,
    commonDirectory: join(root, '.git'),
  });
});

it('aborts a blocked Checkout and removes its worktree and new branch', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-abort-')),
  );
  const controller = new AbortController();
  const checkoutResources: {
    creation?: ReturnType<typeof createCheckout>;
    hookWatcher?: FSWatcher;
  } = {};
  onTestFinished(async (): Promise<void> => {
    checkoutResources.hookWatcher?.close();
    controller.abort();
    await Promise.allSettled([checkoutResources.creation]);
    rmSync(directory, { recursive: true, force: true });
  });
  const git = initTestRepository(directory);
  const checkoutPath = join(
    directory,
    'runtime',
    'worktrees',
    'project',
    'blocked',
  );
  const marker = join(directory, 'hook-started');
  const started = Promise.withResolvers<void>();
  checkoutResources.hookWatcher = watch(directory, (): void => {
    if (existsSync(marker)) started.resolve();
  });
  checkoutResources.hookWatcher.on('error', started.reject);
  writeFileSync(
    join(directory, '.git', 'hooks', 'post-checkout'),
    [
      '#!/bin/sh',
      `echo partial > '${checkoutPath}/half-created'`,
      `echo started > '${marker}'`,
      `while [ -d '${checkoutPath}' ]; do /bin/sleep 0.01; done`,
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  const creation = createCheckout(
    {
      projectPath: directory,
      projectId: 'project',
      sessionId: 'blocked',
      choice: { type: 'worktree', baseBranch: 'main' },
      runtimeDirectory: join(directory, 'runtime'),
    },
    controller.signal,
  );
  checkoutResources.creation = creation;
  void creation.catch(started.reject);
  await started.promise;
  expect(existsSync(checkoutPath)).toBe(true);
  controller.abort();
  await expect(creation).rejects.toMatchObject({ name: 'AbortError' });
  expect(existsSync(checkoutPath)).toBe(false);
  expect(git('branch', '--list', 'argo/blocked').trim()).toBe('');
  expect(git('worktree', 'list')).not.toContain(checkoutPath);
});

it('preserves an existing Session branch when Checkout creation fails', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-collision-')),
  );
  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = initTestRepository(directory);
  git('branch', occupiedBranch);
  const original = git('rev-parse', occupiedBranch);
  await expect(
    createCheckout(
      {
        projectPath: directory,
        projectId: 'project',
        sessionId: 'occupied',
        choice: { type: 'worktree', baseBranch: 'main' },
        runtimeDirectory: join(directory, 'runtime'),
      },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({
    name: 'Error',
    stderr: expect.stringContaining('already exists'),
  });
  expect(git('rev-parse', occupiedBranch)).toBe(original);
});

it('preserves an existing worktree and branch when creation starts with an aborted signal', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-existing-')),
  );
  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = initTestRepository(directory);
  const checkoutPath = join(
    directory,
    'runtime',
    'worktrees',
    'project',
    'occupied',
  );
  mkdirSync(join(directory, 'runtime', 'worktrees', 'project'), {
    recursive: true,
  });
  git('worktree', 'add', '-q', '-b', occupiedBranch, checkoutPath, 'main');
  const original = git('rev-parse', occupiedBranch);
  await expect(
    createCheckout(
      {
        projectPath: directory,
        projectId: 'project',
        sessionId: 'occupied',
        choice: { type: 'worktree', baseBranch: 'main' },
        runtimeDirectory: join(directory, 'runtime'),
      },
      AbortSignal.abort(),
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(existsSync(checkoutPath)).toBe(true);
  expect(git('rev-parse', occupiedBranch)).toBe(original);
  expect(git('worktree', 'list')).toContain(checkoutPath);
});

it('refuses a normal discard of a dirty Checkout', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-dirty-')),
  );
  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = initTestRepository(directory);
  const checkout = await createCheckout(
    {
      projectPath: directory,
      projectId: 'project',
      sessionId: 'dirty',
      choice: { type: 'worktree', baseBranch: 'main' },
      runtimeDirectory: join(directory, 'runtime'),
    },
    new AbortController().signal,
  );
  const file = join(checkout.path, 'untracked-file');
  writeFileSync(file, 'Keep this edit');
  await expect(
    discardCheckout(directory, checkout, new AbortController().signal),
  ).rejects.toMatchObject({
    name: 'Error',
    stderr: expect.stringContaining('modified or untracked files'),
  });
  expect(existsSync(file)).toBe(true);
  expect(
    git('branch', '--list', '--format=%(refname:short)', 'argo/dirty').trim(),
  ).toBe('argo/dirty');
});
