import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isSessionBranch, readRepository, sessionBranch } from '@repo/git';
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
