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
import { isSessionBranch, readRepository, sessionBranch } from './index';
import { initTestRepository } from './test-repository.test.mocks';

it('reads the repository root and common directory from a nested path', async (): Promise<void> => {
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
  const git = await initTestRepository(root);
  const worktree = join(directory, 'linked checkout');
  await git('worktree', 'add', '-q', '-b', 'linked', worktree, 'main');
  const nested = join(worktree, 'nested folder');
  mkdirSync(nested);
  const alias = join(directory, 'alias');
  symlinkSync(nested, alias, 'dir');
  expect(await readRepository(alias)).toEqual({
    root: worktree,
    commonDirectory: join(root, '.git'),
  });
});
