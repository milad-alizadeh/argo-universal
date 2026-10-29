import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { createCheckout, discardCheckout } from './index';
import { initTestRepository } from './test-repository.test.mocks';

const occupiedBranch = 'argo/occupied';

it('preserves an existing Session branch when Checkout creation fails', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-collision-')),
  );

  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = await initTestRepository(directory);
  await git('branch', occupiedBranch);
  const original = await git('rev-parse', occupiedBranch);
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
  expect(await git('rev-parse', occupiedBranch)).toBe(original);
});

it('preserves an existing worktree and branch when creation starts with an aborted signal', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-existing-')),
  );

  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = await initTestRepository(directory);

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
  await git(
    'worktree',
    'add',
    '-q',
    '-b',
    occupiedBranch,
    checkoutPath,
    'main',
  );
  const original = await git('rev-parse', occupiedBranch);
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
  expect(await git('rev-parse', occupiedBranch)).toBe(original);
  expect(await git('worktree', 'list')).toContain(checkoutPath);
});

it('refuses a normal discard of a dirty Checkout', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-dirty-')),
  );

  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  const git = await initTestRepository(directory);

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
    (
      await git('branch', '--list', '--format=%(refname:short)', 'argo/dirty')
    ).trim(),
  ).toBe('argo/dirty');
});
