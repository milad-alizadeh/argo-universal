import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import {
  isSessionBranch,
  readCurrentBranch,
  readRepository,
  sessionBranch,
} from './index';
import { initTestRepository } from './test-git.test.mocks';
import { repository, sessionWorktree } from './test-repository.test.mocks';

it('reads the main checkout and common directory from a nested path', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'repository-read-\n')),
  );

  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  await initTestRepository(directory);
  const nested = join(directory, 'nested folder');
  mkdirSync(nested);
  expect(await readRepository(nested)).toEqual({
    mainCheckout: directory,
    commonDirectory: join(directory, '.git'),
  });
});

it('reads the branch a worktree is on now, after it switches, and null once detached', async (): Promise<void> => {
  const { directory, git } = await repository();
  const checkout = await sessionWorktree(directory, git);

  expect(await readCurrentBranch(checkout)).toBe('argo/session-1');
  await git('-C', checkout, 'switch', '-q', '-c', 'later-branch');
  expect(await readCurrentBranch(checkout)).toBe('later-branch');
  await git('-C', checkout, 'switch', '-q', '--detach');
  expect(await readCurrentBranch(checkout)).toBeNull();
});

it('names a Session branch with its stored prefix', (): void => {
  expect(sessionBranch('session-1')).toMatch(/^argo\/[a-z]+-[a-z]+-ssion1$/);
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

it('reads a linked worktree as the main checkout of its repository', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'repository-worktree-')),
  );

  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const root = join(directory, 'repository');
  mkdirSync(root);
  const git = await initTestRepository(root);
  const worktree = join(directory, 'linked checkout');
  await git('worktree', 'add', '-q', '-b', 'linked', worktree, 'main');
  const nested = join(worktree, 'nested folder');
  mkdirSync(nested);
  const alias = join(directory, 'alias');
  symlinkSync(nested, alias, 'dir');
  expect(await readRepository(alias)).toEqual({
    mainCheckout: root,
    commonDirectory: join(root, '.git'),
  });
});
