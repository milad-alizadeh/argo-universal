import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { removeCheckout, type Checkout } from './index';
import { repository, sessionWorktree } from './test-repository.test.mocks';

const checkout = (path: string): Checkout => ({
  path,
  branch: 'argo/session-1',
});

it('clears the files a half-finished worktree removal left behind', async (): Promise<void> => {
  const { directory, git } = await repository();
  const path = await sessionWorktree(directory, git);

  rmSync(join(path, '.git'));
  await git('worktree', 'prune');

  await removeCheckout(directory, checkout(path));

  expect(existsSync(path)).toBe(false);
});

it('leaves a folder alone that holds a repository of its own', async (): Promise<void> => {
  const { directory } = await repository();
  const path = join(directory, 'other');
  mkdirSync(join(path, '.git'), { recursive: true });
  writeFileSync(join(path, 'file'), 'Keep this');

  await expect(removeCheckout(directory, checkout(path))).rejects.toThrow(
    'is not a working tree',
  );
  expect(existsSync(join(path, 'file'))).toBe(true);
});
