import { expect, it } from 'vitest';
import { resolveWorktreeBaseBranch } from './index';
import { repository } from './test-repository.test.mocks';

it('keeps a saved base branch that is still a local branch', async (): Promise<void> => {
  const { directory } = await repository();

  expect(await resolveWorktreeBaseBranch(directory, 'feature')).toBe('feature');
});

it('keeps a saved base branch that only origin still tracks', async (): Promise<void> => {
  const { directory, git } = await repository(false);

  await git('update-ref', 'refs/remotes/origin/release', 'HEAD');

  expect(await resolveWorktreeBaseBranch(directory, 'release')).toBe('release');
});

it("falls back to origin's default branch when the saved base branch is gone", async (): Promise<void> => {
  const { directory, git } = await repository(false);

  await git('update-ref', 'refs/remotes/origin/trunk', 'HEAD');
  await git(
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/trunk',
  );

  expect(await resolveWorktreeBaseBranch(directory, 'dev')).toBe('trunk');
});

it("falls back to the main checkout's branch when origin's default branch is gone too", async (): Promise<void> => {
  const { directory, git } = await repository(false);

  // The remote deleted dev, which origin/HEAD still names.
  await git(
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/dev',
  );

  expect(await resolveWorktreeBaseBranch(directory, 'dev')).toBe('main');
});

it('keeps the saved base branch when nothing can stand in for it', async (): Promise<void> => {
  const { directory, git } = await repository(false);

  await git('switch', '-q', '--detach');

  expect(await resolveWorktreeBaseBranch(directory, 'dev')).toBe('dev');
});
