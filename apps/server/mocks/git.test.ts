import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
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
import { expect, it, onTestFinished } from 'vitest';
import { initTestRepository } from './git';

it('reads the repository root and common directory from a nested path', async () => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'repository-read-\n')),
  );
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  initTestRepository(directory);
  const nested = join(directory, 'nested folder');
  mkdirSync(nested);
  expect(await readRepository(nested)).toEqual({
    root: directory,
    commonDirectory: join(directory, '.git'),
  });
});

it('names a Session branch with its stored prefix', () => {
  expect(sessionBranch('session-1')).toBe('argo/session-1');
});

it.each([
  { branch: 'argo/session-1', sessionId: 'session-1', expected: true },
  { branch: 'argo/session-2', sessionId: 'session-1', expected: false },
  { branch: 'feature/session-1', sessionId: 'session-1', expected: false },
  { branch: null, sessionId: 'session-1', expected: false },
])(
  'recognises $branch as the Session branch: $expected',
  ({ branch, sessionId, expected }) => {
    expect(isSessionBranch(branch, sessionId)).toBe(expected);
  },
);

it('reads a linked worktree through its nested directory alias', async () => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'repository-worktree-')),
  );
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
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

it('aborts a blocked Checkout and removes its worktree and new branch', async () => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-abort-')),
  );
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const git = initTestRepository(directory);
  const checkoutPath = join(
    directory,
    'runtime',
    'worktrees',
    'project',
    'blocked',
  );
  const marker = join(directory, 'hook-started');
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
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
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
  await expect.poll(() => existsSync(marker)).toBe(true);
  expect(existsSync(checkoutPath)).toBe(true);
  controller.abort();
  await expect(creation).rejects.toMatchObject({ name: 'AbortError' });
  expect(existsSync(checkoutPath)).toBe(false);
  expect(git('branch', '--list', 'argo/blocked').trim()).toBe('');
  expect(git('worktree', 'list')).not.toContain(checkoutPath);
});

it('preserves an existing Session branch when Checkout creation fails', async () => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-collision-')),
  );
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const git = initTestRepository(directory);
  git('branch', 'argo/occupied');
  const original = git('rev-parse', 'argo/occupied');
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
  expect(git('rev-parse', 'argo/occupied')).toBe(original);
});

it('preserves an existing worktree and branch when creation starts with an aborted signal', async () => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-existing-')),
  );
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
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
  git('worktree', 'add', '-q', '-b', 'argo/occupied', checkoutPath, 'main');
  const original = git('rev-parse', 'argo/occupied');
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
  expect(git('rev-parse', 'argo/occupied')).toBe(original);
  expect(git('worktree', 'list')).toContain(checkoutPath);
});

it('refuses a normal discard of a dirty Checkout', async () => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-dirty-')),
  );
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
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
